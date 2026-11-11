"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import useSWR from "swr"
import { toast } from "sonner"
import { ArrowLeft, ChevronRight, Database, Save, Search, ShieldAlert, Trash2, UserRound, Users } from "lucide-react"
import { useSession } from "@/components/session-provider"
import { PlayerGrantPanel } from "@/components/dashboard/player-grant-panel"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { BREWS, FINDS_BY_ISLAND, GEAR_BY_SLOT, ISLANDS, SECRET_SITES, VARIANTS } from "@/lib/game-catalog"

interface PlayerSummary {
  userId: string
  username: string
  displayName: string
  avatarUrl: string | null
  level: number | null
  cash: number | null
  island: string | null
  online: boolean
  updatedAt?: string | null
}
interface ProfileData {
  user: PlayerSummary
  data: Record<string, unknown>
  version: string | null
  updatedAt: string | null
  online: boolean
  pendingGrants: Array<Record<string, unknown>>
  versions: Array<{ version: string; createdTime?: string; objectSizeBytes?: number }>
}
interface ListData { players: PlayerSummary[]; nextPageCursor: string | null }

async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || "Request failed")
  return result
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function equal(left: unknown, right: unknown) { return JSON.stringify(left) === JSON.stringify(right) }
function shortDate(value?: string | null) {
  if (!value) return "Unknown"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString()
}

function ProfileEditor({ profile, onSaved }: { profile: ProfileData; onSaved: () => void }) {
  const { activeProject } = useSession()
  const [draft, setDraft] = useState(profile.data)
  const [rawJson, setRawJson] = useState(JSON.stringify(profile.data, null, 2))
  const [saving, setSaving] = useState(false)
  const [rawError, setRawError] = useState("")
  const changedKeys = useMemo(() => [...new Set([...Object.keys(profile.data), ...Object.keys(draft)])].filter((key) => !equal(profile.data[key], draft[key])), [profile.data, draft])
  const isDifferent = changedKeys.length > 0

  useEffect(() => {
    setDraft(profile.data)
    setRawJson(JSON.stringify(profile.data, null, 2))
    setRawError("")
  }, [profile.data, profile.user.userId])

  function update(key: string, value: unknown) { setDraft((current) => ({ ...current, [key]: value })) }
  function updateNested(field: string, key: string, value: unknown) { setDraft((current) => ({ ...current, [field]: { ...record(current[field]), [key]: value } })) }

  async function save() {
    if (!activeProject || profile.online || !isDifferent) return
    if (changedKeys.some((key) => ["Cash", "Level"].includes(key)) && !window.confirm(`Save changes to ${changedKeys.filter((key) => ["Cash", "Level"].includes(key)).join(" and ")}?`)) return
    setSaving(true)
    try {
      const response = await fetch("/api/player-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProject.id, action: "save-profile", userId: profile.user.userId, expectedVersion: profile.version, baseData: profile.data, data: draft }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.fields?.length ? `${result.error}: ${result.fields.join(", ")}` : result.error || "Profile save failed")
      toast.success("Offline profile saved")
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Network error")
    } finally { setSaving(false) }
  }

  function updateRaw(value: string) {
    setRawJson(value)
    try {
      const parsed = JSON.parse(value)
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Profile must be a JSON object")
      setDraft(parsed)
      setRawError("")
    } catch (error) {
      setRawError(error instanceof Error ? error.message : "Invalid JSON")
    }
  }

  const zones = record(draft.Zones)
  const owned = record(draft.Owned)
  const equipped = record(draft.Equipped)
  const backpack = record(draft.Backpack)
  const potions = record(draft.Potions)
  const vaults = record(draft.Vaults)
  const settings = record(draft.Settings)
  const cosmetics = record(draft.Cosmetics)

  return (
    <div className="flex flex-col gap-5">
      {profile.online && <Alert variant="destructive"><ShieldAlert aria-hidden="true" /><AlertTitle>Profile is online</AlertTitle><AlertDescription>This record is locked by a live server. Direct saves and restores are disabled; use the grant panel below instead.</AlertDescription></Alert>}
      {!profile.online && <Alert><Database aria-hidden="true" /><AlertTitle>Offline profile editor</AlertTitle><AlertDescription>Changes are version-checked, unknown fields are preserved, and a diff is shown before saving.</AlertDescription></Alert>}

      {isDifferent && <Card className="border-primary/25 bg-primary/5"><CardHeader className="pb-2"><CardTitle className="text-sm">Change preview</CardTitle><CardDescription>{changedKeys.length} top-level field{changedKeys.length === 1 ? "" : "s"} changed</CardDescription></CardHeader><CardContent className="flex flex-col gap-2">{changedKeys.map((key) => <div key={key} className="grid gap-1 text-xs sm:grid-cols-[140px_1fr]"><span className="font-mono font-semibold">{key}</span><span className="break-all text-muted-foreground">{JSON.stringify(profile.data[key]) ?? "(missing)"} <ChevronRight aria-hidden="true" className="inline size-3" /> <span className="text-foreground">{JSON.stringify(draft[key]) ?? "(removed)"}</span></span></div>)}</CardContent></Card>}

      <Tabs defaultValue="profile">
        <TabsList className="w-full justify-start overflow-x-auto"><TabsTrigger value="profile">Profile</TabsTrigger><TabsTrigger value="raw">Advanced JSON</TabsTrigger><TabsTrigger value="history">Versions</TabsTrigger></TabsList>
        <TabsContent value="profile" className="mt-4 flex flex-col gap-5">
          <Card><CardHeader><CardTitle>Core stats</CardTitle><CardDescription>Saved player values. Earned and audit fields stay read-only.</CardDescription></CardHeader><CardContent><FieldGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(["Cash", "Level", "XP", "Rebirths"] as const).map((key) => <Field key={key}><FieldLabel htmlFor={`profile-${key}`}>{key}</FieldLabel><Input id={`profile-${key}`} type="number" min={key === "Level" ? 1 : 0} max={key === "Level" ? 999 : undefined} value={String(draft[key] ?? 0)} disabled={profile.online} onChange={(e) => update(key, Number(e.target.value))} /></Field>)}
            <Field><FieldLabel htmlFor="profile-earned">Lifetime earned</FieldLabel><Input id="profile-earned" type="number" value={String(draft.Earned ?? 0)} disabled readOnly /></Field>
            <Field><FieldLabel htmlFor="profile-island">Home island</FieldLabel><Select value={String(draft.Island ?? "reef")} onValueChange={(value) => update("Island", value)} disabled={profile.online}><SelectTrigger id="profile-island"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{ISLANDS.map((island) => <SelectItem key={island.id} value={island.id}>{island.name}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
          </FieldGroup></CardContent></Card>

          <Card><CardHeader><CardTitle>Charted islands</CardTitle><CardDescription>Toggle the charted-zone map stored in Zones.</CardDescription></CardHeader><CardContent><FieldSet><FieldLegend variant="label">Islands</FieldLegend><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{ISLANDS.map((island) => <label key={island.id} className="flex items-center gap-2 rounded-md border border-border/70 p-3 text-sm"><Checkbox checked={zones[island.id] === true} disabled={profile.online} onCheckedChange={(checked) => updateNested("Zones", island.id, checked === true)} />{island.name}</label>)}</div></FieldSet></CardContent></Card>

          <Card><CardHeader><CardTitle>Gear</CardTitle><CardDescription>Update owned items and equipped slot selections.</CardDescription></CardHeader><CardContent className="flex flex-col gap-5">{Object.entries(GEAR_BY_SLOT).map(([slot, gear]) => <details key={slot} className="rounded-lg border border-border/70 p-4"><summary className="cursor-pointer text-sm font-medium">{slot}</summary><div className="mt-4 grid gap-4 md:grid-cols-2"><Field><FieldLabel htmlFor={`equipped-${slot}`}>Equipped</FieldLabel><Select value={String(equipped[slot] ?? "none")} onValueChange={(value) => updateNested("Equipped", slot, value === "none" ? "" : value)} disabled={profile.online}><SelectTrigger id={`equipped-${slot}`}><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="none">None</SelectItem>{gear.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectGroup></SelectContent></Select></Field><fieldset className="flex flex-col gap-2"><legend className="text-sm font-medium">Owned items</legend>{gear.map(([id, name]) => <label key={id} className="flex items-center gap-2 text-sm"><Checkbox checked={owned[id] === true} disabled={profile.online} onCheckedChange={(checked) => updateNested("Owned", id, checked === true)} />{name}</label>)}</fieldset></div></details>)}</CardContent></Card>

          <Card><CardHeader><CardTitle>Backpack</CardTitle><CardDescription>Find stacks use itemId|Variant; blank variant means normal.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3">{Object.entries(backpack).map(([key, value]) => { const [itemId, variant] = key.split("|"); return <div key={key} className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_auto]"><Field><FieldLabel>Find</FieldLabel><Select value={itemId} onValueChange={(next) => { const copy = { ...backpack }; const sizes = { ...record(draft.BackpackSize) }; delete copy[key]; delete sizes[key]; const nextKey = `${next}|${variant ?? ""}`; copy[nextKey] = value; sizes[nextKey] = value; update("Backpack", copy); update("BackpackSize", sizes) }} disabled={profile.online}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(FINDS_BY_ISLAND).map(([islandId, finds]) => <SelectGroup key={islandId}><SelectLabel>{islandId}</SelectLabel>{finds.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectGroup>)}</SelectContent></Select></Field><Field><FieldLabel>Variant</FieldLabel><Select value={variant || "normal"} onValueChange={(next) => { const copy = { ...backpack }; const sizes = { ...record(draft.BackpackSize) }; delete copy[key]; delete sizes[key]; const nextKey = `${itemId}|${next === "normal" ? "" : next}`; copy[nextKey] = value; sizes[nextKey] = value; update("Backpack", copy); update("BackpackSize", sizes) }} disabled={profile.online}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="normal">Normal</SelectItem>{VARIANTS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent></Select></Field><Field><FieldLabel>Count</FieldLabel><Input type="number" min="1" value={String(value)} disabled={profile.online} onChange={(e) => { const count = Number(e.target.value); update("Backpack", { ...backpack, [key]: count }); update("BackpackSize", { ...record(draft.BackpackSize), [key]: count }) }} /></Field><Button type="button" variant="ghost" size="icon" aria-label={`Remove ${key}`} disabled={profile.online} onClick={() => { const copy = { ...backpack }; const sizes = { ...record(draft.BackpackSize) }; delete copy[key]; delete sizes[key]; update("Backpack", copy); update("BackpackSize", sizes) }}><Trash2 aria-hidden="true" /></Button></div>})}<Button type="button" variant="outline" className="self-start" disabled={profile.online} onClick={() => { const next = { ...backpack }; const key = "clownfish|"; const count = Number(next[key] ?? 0) + 1; next[key] = count; update("Backpack", next); update("BackpackSize", { ...record(draft.BackpackSize), [key]: count }) }}>Add find stack</Button></CardContent></Card>

          <Card><CardHeader><CardTitle>Brews and preferences</CardTitle><CardDescription>Brew values are seconds remaining, capped at 60 minutes.</CardDescription></CardHeader><CardContent className="flex flex-col gap-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{BREWS.map((brew) => <Field key={brew.id}><FieldLabel htmlFor={`brew-${brew.id}`}>{brew.name} · minutes</FieldLabel><Input id={`brew-${brew.id}`} type="number" min="0" max="60" step="1" value={String(Math.round(Number(potions[brew.id] ?? 0) / 60))} disabled={profile.online} onChange={(e) => updateNested("Potions", brew.id, Math.max(0, Math.min(60, Number(e.target.value))) * 60)} /></Field>)}</div><FieldSet><FieldLegend variant="label">Game settings</FieldLegend><div className="flex flex-wrap gap-3">{["Music", "Sfx", "Effects"].map((key) => <label key={key} className="flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-sm"><Checkbox checked={settings[key] !== false} disabled={profile.online} onCheckedChange={(checked) => updateNested("Settings", key, checked === true)} />{key}</label>)}</div></FieldSet></CardContent></Card>

          <Card><CardHeader><CardTitle>Cosmetics and milestones</CardTitle><CardDescription>Existing cosmetic flags and first-time tutorial milestones.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><FieldSet><FieldLegend variant="label">Cosmetics</FieldLegend><div className="flex flex-wrap gap-3">{Object.entries(cosmetics).filter(([, value]) => typeof value === "boolean").map(([key, value]) => <label key={key} className="flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-sm"><Checkbox checked={value === true} disabled={profile.online} onCheckedChange={(checked) => updateNested("Cosmetics", key, checked === true)} />{key}</label>)}</div>{Object.keys(cosmetics).length === 0 && <p className="text-xs text-muted-foreground">No cosmetic flags found in this profile.</p>}</FieldSet><FieldSet><FieldLegend variant="label">Progress milestones</FieldLegend><div className="flex flex-wrap gap-3">{["TutorialDone", "TutorialGift", "FirstCatch"].map((key) => <label key={key} className="flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-sm"><Checkbox checked={draft[key] === true} disabled={profile.online} onCheckedChange={(checked) => update(key, checked === true)} />{key}</label>)}</div></FieldSet></CardContent></Card>

          <Card><CardHeader><CardTitle>Secret sites</CardTitle><CardDescription>Reveal state and cooldown metadata are preserved.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{SECRET_SITES.map((site) => { const entry = record(vaults[site.id]); return <label key={site.id} className="flex items-center gap-2 rounded-md border border-border/70 p-3 text-sm"><Checkbox checked={entry.found === true} disabled={profile.online} onCheckedChange={(checked) => updateNested("Vaults", site.id, { ...entry, found: checked === true })} />{site.name}</label>})}</CardContent></Card>

          <Card><CardHeader><CardTitle>Read-only game data</CardTitle><CardDescription>Receipts and applied-grant IDs must never be edited. Other advanced structures are preserved.</CardDescription></CardHeader><CardContent><details><summary className="cursor-pointer text-sm font-medium">View saved fields</summary><pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-muted/40 p-3 text-xs">{JSON.stringify(Object.fromEntries(["Earned", "Index", "Places", "Quests", "Achievements", "CompletedZones", "Daily", "Stats", "Cosmetics", "TutorialDone", "TutorialGift", "FirstCatch", "FirstJoin", "Receipts", "AdminSeen", "_lock", "Version"].filter((key) => draft[key] !== undefined).map((key) => [key, draft[key]])), null, 2)}</pre></details></CardContent></Card>
        </TabsContent>

        <TabsContent value="raw" className="mt-4"><Card><CardHeader><CardTitle>Advanced JSON</CardTitle><CardDescription>Unknown game fields are preserved. Server-side validation blocks edits to read-only fields.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3"><Textarea value={rawJson} onChange={(event) => updateRaw(event.target.value)} disabled={profile.online} className="min-h-[420px] font-mono text-xs" aria-label="Advanced player profile JSON" />{rawError && <p role="alert" className="text-sm text-destructive">{rawError}</p>}</CardContent></Card></TabsContent>

        <TabsContent value="history" className="mt-4"><Card><CardHeader><CardTitle>DataStore versions</CardTitle><CardDescription>Restore is available only while the player is offline.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3">{profile.versions.length ? profile.versions.map((version) => <div key={version.version} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 p-3"><div><p className="font-mono text-xs">{version.version}</p><p className="mt-1 text-xs text-muted-foreground">{shortDate(version.createdTime)}{version.objectSizeBytes ? ` · ${version.objectSizeBytes} bytes` : ""}</p></div><Button type="button" variant="outline" size="sm" disabled={profile.online || saving} onClick={async () => { if (!window.confirm(`Restore profile version from ${shortDate(version.createdTime)}?`)) return; if (!activeProject) return; setSaving(true); try { const response = await fetch("/api/player-profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: activeProject.id, action: "restore", userId: profile.user.userId, versionId: version.version }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Restore failed"); toast.success("Profile restored"); onSaved() } catch (error) { toast.error(error instanceof Error ? error.message : "Restore failed") } finally { setSaving(false) } }}>Restore</Button></div>) : <p className="text-sm text-muted-foreground">No stored versions were returned by Roblox.</p>}</CardContent></Card></TabsContent>
      </Tabs>

      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Last saved: {shortDate(profile.updatedAt)} · version {profile.version ?? "unknown"}</p><Button type="button" onClick={() => void save()} disabled={!isDifferent || profile.online || saving || Boolean(rawError)}>{saving ? "Saving…" : <><Save data-icon="inline-start" />Save offline profile</>}</Button></div>
    </div>
  )
}

function ProfileActivityHistory({ userId }: { userId: string }) {
  const { activeProject } = useSession()
  const { data, error, isLoading } = useSWR<{ logs: Array<{ id: string | number; action: string; user_name?: string; details?: string; created_at?: string }> }>(
    activeProject ? `/api/logs?projectId=${encodeURIComponent(activeProject.id)}` : null,
    fetcher,
  )
  const history = (data?.logs ?? []).filter((log) => {
    if (!["player-grant", "player-grant-cancel", "profile-save", "profile-restore"].includes(log.action)) return false
    try {
      const details = JSON.parse(log.details ?? "{}") as { target?: unknown }
      const target = details.target
      if (target === userId) return true
      if (target && typeof target === "object") {
        const values = target as Record<string, unknown>
        return values.userId === userId || values.key === `u_${userId}` || values.key === `grants_${userId}`
      }
    } catch { return false }
    return false
  }).slice(0, 6)

  return <Card><CardHeader><CardTitle>Recent activity</CardTitle><CardDescription>Recent profile and grant changes from the Activity Log.</CardDescription></CardHeader><CardContent className="flex flex-col gap-2">{error ? <p role="alert" className="text-sm text-muted-foreground">Activity history is unavailable for this account.</p> : isLoading ? <p className="text-sm text-muted-foreground">Loading recent activity…</p> : history.length ? history.map((log) => <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 px-3 py-2"><div><p className="text-sm font-medium">{log.action.replaceAll("-", " ")}</p><p className="text-xs text-muted-foreground">By {log.user_name || "Unknown"}</p></div><time className="text-xs text-muted-foreground">{shortDate(log.created_at)}</time></div>) : <p className="text-sm text-muted-foreground">No profile or grant actions recorded yet.</p>}</CardContent></Card>
}

function PendingGrantList({ grants, userId, onChanged }: { grants: Array<Record<string, unknown>>; userId: string; onChanged: () => void }) {
  const { activeProject } = useSession()
  const [removing, setRemoving] = useState<string | null>(null)
  async function cancel(grantId: string) {
    if (!activeProject || !window.confirm("Cancel this grant if the game has not applied it yet?")) return
    setRemoving(grantId)
    try {
      const response = await fetch("/api/player-profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: activeProject.id, action: "cancel-grant", userId, grantId }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Could not cancel grant")
      toast.success("Pending grant canceled")
      onChanged()
    } catch (error) { toast.error(error instanceof Error ? error.message : "Cancel failed") }
    finally { setRemoving(null) }
  }
  return <Card><CardHeader><CardTitle>Pending grants</CardTitle><CardDescription>Queued changes are applied by the game once and removed after application.</CardDescription></CardHeader><CardContent className="flex flex-col gap-2">{grants.length ? grants.map((grant) => <div key={String(grant.id)} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 p-3"><div><p className="text-sm font-medium">{String(grant.type)} · {String(grant.amount ?? grant.item ?? grant.brew ?? grant.island ?? grant.level ?? "")}</p><p className="text-xs text-muted-foreground">{String(grant.note || "No note")} · {grant.by ? `by ${String(grant.by)}` : ""}</p></div><Button type="button" variant="outline" size="sm" disabled={removing === grant.id} onClick={() => void cancel(String(grant.id))}>{removing === grant.id ? "Canceling…" : "Cancel"}</Button></div>) : <p className="text-sm text-muted-foreground">No pending changes.</p>}</CardContent></Card>
}

export function PlayerProfileManager() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { activeProject } = useSession()
  const [query, setQuery] = useState("")
  const [cursor, setCursor] = useState("")
  const selectedUserId = searchParams.get("userId") ?? ""
  const queryString = query.trim() ? `&q=${encodeURIComponent(query.trim())}` : cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""
  const { data: listData, isLoading: listLoading, error: listError, mutate: mutateList } = useSWR<ListData>(
    activeProject ? `/api/player-profiles?projectId=${encodeURIComponent(activeProject.id)}${queryString}` : null,
    fetcher,
  )
  const { data: profile, isLoading: profileLoading, error: profileError, mutate: mutateProfile } = useSWR<ProfileData>(
    activeProject && selectedUserId ? `/api/player-profiles?action=profile&projectId=${encodeURIComponent(activeProject.id)}&userId=${encodeURIComponent(selectedUserId)}` : null,
    fetcher,
  )

  function selectProfile(userId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("userId", userId)
    router.replace(`/dashboard/profiles?${params.toString()}`, { scroll: false })
  }

  if (!activeProject) return <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Select a project to search player profiles.</div>

  return (
    <div className="flex flex-col gap-6">
      <header><div className="mb-2 flex items-center gap-2 text-primary"><UserRound aria-hidden="true" className="size-4" /><span className="font-mono text-[10px] uppercase tracking-[0.18em]">DataStore · DeepDive_PlayerData_v1</span></div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Player profiles</h1><p className="mt-1 text-sm text-muted-foreground">Find online or offline players, safely edit saved data, restore versions, and queue exactly-once grants.</p></header>
      <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.6fr)]">
        <Card className="border-border/70 bg-card/80"><CardHeader><CardTitle className="flex items-center gap-2"><Users aria-hidden="true" className="size-4 text-primary" />Players</CardTitle><CardDescription>Search by username, display name, or Roblox user ID.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3"><div className="relative"><Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => { setQuery(event.target.value); setCursor("") }} placeholder="Username, display name, or ID" className="pl-9" aria-label="Search player profiles" /></div>{listError && <p role="alert" className="text-sm text-destructive">{listError.message}</p>}{listLoading ? <p className="py-4 text-center text-sm text-muted-foreground">Loading player profiles…</p> : listData?.players.length ? <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto">{listData.players.map((player) => <button key={player.userId} type="button" onClick={() => selectProfile(player.userId)} className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/40 ${selectedUserId === player.userId ? "border-primary/50 bg-primary/5" : "border-border/70"}`}><Avatar className="size-10"><AvatarImage src={player.avatarUrl ?? undefined} alt="" /><AvatarFallback>{player.displayName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{player.displayName}</span><span className="block truncate text-xs text-muted-foreground">@{player.username} · {player.userId}</span>                  <span className="mt-1 block text-[11px] text-muted-foreground">Lv {player.level ?? "—"} · ${Number(player.cash ?? 0).toLocaleString()} · {player.island ?? "—"}</span>
                  <span className="mt-1 block text-[10px] text-muted-foreground">Saved {player.updatedAt ? shortDate(player.updatedAt) : "Unknown"}</span></span><Badge variant={player.online ? "default" : "secondary"}>{player.online ? "Online" : "Offline"}</Badge></button>)}</div> : <div className="rounded-lg border border-dashed border-border p-6 text-center"><p className="text-sm font-medium">No matching profiles</p><p className="mt-1 text-xs text-muted-foreground">An offline player appears after their profile key exists in the DataStore.</p></div>}{listData?.nextPageCursor && !query.trim() && <Button type="button" variant="outline" onClick={() => setCursor(listData.nextPageCursor ?? "")}>Load next page</Button>}</CardContent></Card>

        <div className="flex min-w-0 flex-col gap-5">{!selectedUserId ? <Card className="flex min-h-64 items-center justify-center border-dashed"><CardContent className="pt-6 text-center"><UserRound aria-hidden="true" className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 text-sm font-medium">Select a player</p><p className="mt-1 text-xs text-muted-foreground">Choose a player from the list to open their profile and tools.</p></CardContent></Card> : profileLoading ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading player profile…</CardContent></Card> : profileError || !profile ? <Card><CardContent className="flex flex-col gap-3 py-8 text-center"><p role="alert" className="text-sm text-destructive">{profileError?.message ?? "Player profile unavailable"}</p><Button type="button" variant="outline" onClick={() => router.replace("/dashboard/profiles")}>Back to all players</Button></CardContent></Card> : <>
          <Card className="border-border/70 bg-card/80"><CardHeader className="flex flex-row items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><Avatar className="size-12"><AvatarImage src={profile.user.avatarUrl ?? undefined} alt="" /><AvatarFallback>{profile.user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0"><CardTitle className="truncate">{profile.user.displayName}</CardTitle><CardDescription className="truncate">@{profile.user.username} · {profile.user.userId}</CardDescription></div></div><div className="flex items-center gap-2"><Badge variant={profile.online ? "default" : "secondary"}>{profile.online ? "Online" : "Offline"}</Badge><Button type="button" variant="ghost" size="icon" aria-label="Back to player list" onClick={() => router.replace("/dashboard/profiles")}><ArrowLeft aria-hidden="true" /></Button></div></CardHeader></Card>
          <ProfileEditor profile={profile} onSaved={() => { void mutateProfile(); void mutateList() }} />
          <PlayerGrantPanel userId={selectedUserId} displayName={profile.user.displayName} quickActions currentIsland={typeof profile.data.Island === "string" ? profile.data.Island : null} onGranted={() => { void mutateProfile(); void mutateList() }} />
          <PendingGrantList grants={profile.pendingGrants} userId={selectedUserId} onChanged={() => { void mutateProfile(); void mutateList() }} />
          <ProfileActivityHistory userId={selectedUserId} />
        </>}</div>
      </div>
    </div>
  )
}
