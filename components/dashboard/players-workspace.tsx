"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession } from "@/components/session-provider"
import { PlayerGrantDialog } from "@/components/dashboard/player-grant-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DateTimePicker } from "@/components/date-time-picker"
import {
  Users, Search, Shield, MessageSquare, XCircle, RefreshCw,
  AlertTriangle, Loader2, Clock, Gift, UserRound,
} from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlayerProfileManager } from "@/components/dashboard/player-profile-manager"
import { BanManager } from "@/components/dashboard/ban-manager"

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Player {
  user_id: string
  display_name: string
  username: string
  server_id: string
  play_time: number
  account_age: number
  avatar_url: string
  level: number | null
  cash: number | null
  island: string | null
}

export function PlayersWorkspace({ initialTab = "online" }: { initialTab?: "online" | "profiles" | "bans" }) {
  const { activeProject } = useSession()
  const [activeTab, setActiveTab] = useState(initialTab)
  const { data, mutate, isLoading } = useSWR(
    activeProject ? `/api/players?projectId=${activeProject.id}` : null,
    fetcher,
    { refreshInterval: 15000 }
  )

  const [search, setSearch] = useState("")
  const [actionTarget, setActionTarget] = useState<Player | null>(null)
  const [actionType, setActionType] = useState<"kick" | "ban" | "warn" | "message" | null>(null)
  const [actionReason, setActionReason] = useState("")
  const [actionMessage, setActionMessage] = useState("")
  const [banPrivateReason, setBanPrivateReason] = useState("")
  const [banDuration, setBanDuration] = useState("1d")
  const [banCustomDate, setBanCustomDate] = useState<Date | undefined>()
  const [acting, setActing] = useState(false)
  const [grantTarget, setGrantTarget] = useState<Player | null>(null)

  const players: Player[] = data?.players ?? []
  const filtered = players.filter(p =>
    !search || p.display_name.toLowerCase().includes(search.toLowerCase()) ||
    p.user_id.includes(search) || p.username.toLowerCase().includes(search.toLowerCase())
  )

  const executeAction = async () => {
    if (!activeProject || !actionTarget || !actionType) return
    setActing(true)
    try {
      if (actionType === "ban") {
        // Use the ban API with full options
        let durationSeconds: number | null = null
        let expiresAt: string | null = null
        if (banDuration === "custom" && banCustomDate) {
          durationSeconds = Math.max(0, Math.floor((banCustomDate.getTime() - Date.now()) / 1000))
          expiresAt = banCustomDate.toISOString()
        } else if (banDuration !== "permanent") {
          const map: Record<string, number> = { "1h": 3600, "6h": 21600, "12h": 43200, "1d": 86400, "3d": 259200, "7d": 604800, "30d": 2592000 }
          durationSeconds = map[banDuration] ?? null
        }
        const res = await fetch("/api/bans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: activeProject.id,
            robloxUserId: actionTarget.user_id,
            reason: actionReason || "No reason provided",
            privateReason: banPrivateReason,
            duration: banDuration,
            durationSeconds,
            expiresAt,
          }),
        })
        if (res.ok) { toast.success(`${actionTarget.display_name} has been banned`); mutate() }
        else { const d = await res.json(); toast.error(d.error || "Ban failed") }
      } else {
        // kick, warn, message -- use player actions API
        const res = await fetch("/api/players", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: activeProject.id,
            action: actionType,
            targetUserId: actionTarget.user_id,
            targetName: actionTarget.display_name,
            reason: actionReason,
            message: actionMessage,
          }),
        })
        if (res.ok) { toast.success(`${actionType.toUpperCase()} sent for ${actionTarget.display_name}`); mutate() }
        else { const d = await res.json(); toast.error(d.error || "Failed") }
      }
    } catch { toast.error("Network error") }
    finally {
      setActing(false)
      setActionTarget(null)
      setActionType(null)
      setActionReason("")
      setActionMessage("")
      setBanPrivateReason("")
      setBanDuration("1d")
      setBanCustomDate(undefined)
    }
  }

  const openAction = (player: Player, type: "kick" | "ban" | "warn" | "message") => {
    setActionTarget(player)
    setActionType(type)
  }

  const formatPlayTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    if (m < 60) return `${m}m`
    const h = Math.floor(m / 60)
    return `${h}h ${m % 60}m`
  }

  if (!activeProject) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="border border-border bg-card p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-4" />
          <p className="font-mono text-xs text-muted-foreground">Select a project first.</p>
        </div>
      </div>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "online" | "profiles" | "bans")} className="flex flex-col gap-4">
      <TabsList className="w-full justify-start border-b border-border/70 bg-transparent p-0">
        <TabsTrigger value="online">Online players</TabsTrigger>
        <TabsTrigger value="profiles">Player profiles</TabsTrigger>
        <TabsTrigger value="bans">Ban records</TabsTrigger>
      </TabsList>
      <TabsContent value="online" className="mt-0">
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-4 w-4 text-primary" />
          <span className="font-mono text-xs text-foreground">{players.length} ONLINE PLAYERS</span>
        </div>
        <Button variant="outline" size="sm" className="font-mono text-[10px] h-7 gap-1.5" onClick={() => mutate()} disabled={isLoading}>
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          REFRESH
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search by name, username, or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 font-mono text-xs h-8 bg-card border-border"
        />
      </div>

      {/* Player List */}
      {isLoading ? (
        <div className="space-y-1">
          {[1,2,3,4,5].map(i => <div key={i} className="h-14 animate-pulse bg-card border border-border" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-border bg-card p-8 text-center">
          <Users className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <span className="font-mono text-xs text-muted-foreground block">{search ? "No players match your search" : "No players currently online"}</span>
        </div>
      ) : (
        <div className="border border-border bg-card divide-y divide-border">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 bg-muted/50 px-4 py-2">
            <span className="col-span-10 font-mono text-[9px] uppercase tracking-widest text-muted-foreground md:col-span-4">Player</span>
            <span className="hidden font-mono text-[9px] uppercase tracking-widest text-muted-foreground lg:block lg:col-span-1">Level</span>
            <span className="hidden font-mono text-[9px] uppercase tracking-widest text-muted-foreground lg:block lg:col-span-1">Cash</span>
            <span className="hidden font-mono text-[9px] uppercase tracking-widest text-muted-foreground xl:block xl:col-span-1">Island</span>
            <span className="hidden font-mono text-[9px] uppercase tracking-widest text-muted-foreground md:block md:col-span-1">Server</span>
            <span className="hidden font-mono text-[9px] uppercase tracking-widest text-muted-foreground md:block md:col-span-1">Time</span>
            <span className="hidden font-mono text-[9px] uppercase tracking-widest text-muted-foreground lg:block lg:col-span-1">Age</span>
            <span className="col-span-2 text-right font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Actions</span>
          </div>
          {filtered.map(player => (
            <div key={player.user_id} className="grid grid-cols-12 items-center gap-2 px-4 py-2.5 transition-colors hover:bg-accent/30">
              <div className="col-span-10 flex min-w-0 items-center gap-3 md:col-span-4">
                <img src={player.avatar_url} alt="" className="size-7 shrink-0 border border-border" crossOrigin="anonymous" />
                <div className="min-w-0">
                  <Link href={`/dashboard/players?tab=profiles&userId=${encodeURIComponent(player.user_id)}`} onClick={() => setActiveTab("profiles")} className="block truncate font-mono text-xs text-foreground hover:text-primary">{player.display_name}</Link>
                  <span className="block truncate font-mono text-[10px] text-muted-foreground">@{player.username} / {player.user_id}</span>
                </div>
              </div>
              <div className="hidden font-mono text-[10px] text-foreground lg:block lg:col-span-1">{player.level ?? "—"}</div>
              <div className="hidden font-mono text-[10px] text-foreground lg:block lg:col-span-1">{player.cash === null ? "—" : `$${player.cash.toLocaleString()}`}</div>
              <div className="hidden truncate font-mono text-[10px] text-foreground xl:block xl:col-span-1">{player.island || "—"}</div>
              <div className="hidden font-mono text-[10px] text-muted-foreground md:block md:col-span-1">{player.server_id.slice(0, 7)}…</div>
              <div className="hidden items-center gap-1 md:flex md:col-span-1"><Clock aria-hidden="true" className="size-3 text-muted-foreground" /><span className="font-mono text-[10px] text-foreground">{formatPlayTime(player.play_time)}</span></div>
              <div className="hidden font-mono text-[10px] text-muted-foreground lg:block lg:col-span-1">{player.account_age}d</div>
              <div className="col-span-2 flex items-center justify-end gap-1">
                <Link href={`/dashboard/players?tab=profiles&userId=${encodeURIComponent(player.user_id)}`} onClick={() => setActiveTab("profiles")} aria-label={`Open ${player.display_name} profile`} title="Open profile" className="rounded p-1 text-muted-foreground transition-colors hover:text-primary"><UserRound aria-hidden="true" className="size-3.5" /></Link>
                <button type="button" onClick={() => setGrantTarget(player)} className="rounded p-1 text-muted-foreground transition-colors hover:text-primary" aria-label={`Give or change ${player.display_name} data`} title="Give / change"><Gift aria-hidden="true" className="size-3.5" /></button>
                <button type="button" onClick={() => openAction(player, "message")} className="rounded p-1 text-muted-foreground transition-colors hover:text-primary" aria-label={`Message ${player.display_name}`} title="Message"><MessageSquare aria-hidden="true" className="size-3.5" /></button>
                <button type="button" onClick={() => openAction(player, "warn")} className="rounded p-1 text-muted-foreground transition-colors hover:text-warning" aria-label={`Warn ${player.display_name}`} title="Warn"><AlertTriangle aria-hidden="true" className="size-3.5" /></button>
                <button type="button" onClick={() => openAction(player, "kick")} className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive" aria-label={`Kick ${player.display_name}`} title="Kick"><XCircle aria-hidden="true" className="size-3.5" /></button>
                <button type="button" onClick={() => openAction(player, "ban")} className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive" aria-label={`Ban ${player.display_name}`} title="Ban"><Shield aria-hidden="true" className="size-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PlayerGrantDialog
        open={!!grantTarget}
        userId={grantTarget?.user_id ?? ""}
        displayName={grantTarget?.display_name ?? "Player"}
        onOpenChange={(open) => { if (!open) setGrantTarget(null) }}
        onGranted={() => { void mutate(); setGrantTarget(null) }}
      />

      {/* Action Dialog */}
      <AlertDialog open={!!actionTarget && !!actionType} onOpenChange={open => { if (!open) { setActionTarget(null); setActionType(null) } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-sm uppercase">
              {actionType?.toUpperCase()} - {actionTarget?.display_name}
            </AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-xs">
              This will send a {actionType} command to the game server for player {actionTarget?.user_id}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            {actionType === "ban" && (
              <>
                <div className="space-y-1">
                  <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Duration</Label>
                  <Select value={banDuration} onValueChange={setBanDuration}>
                    <SelectTrigger className="font-mono text-xs h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["1h","6h","12h","1d","3d","7d","30d","permanent","custom"].map(d => (
                        <SelectItem key={d} value={d} className="font-mono text-xs">{d.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {banDuration === "custom" && (
                  <div className="space-y-1">
                    <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Custom Expiry</Label>
                    <DateTimePicker date={banCustomDate} onDateChange={setBanCustomDate} />
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Display Reason (player sees this)</Label>
                  <Textarea value={actionReason} onChange={e => setActionReason(e.target.value)} placeholder="Reason shown to the player..." className="font-mono text-xs min-h-[60px] resize-none" />
                </div>
                <div className="space-y-1">
                  <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Private Reason (internal)</Label>
                  <Input value={banPrivateReason} onChange={e => setBanPrivateReason(e.target.value)} placeholder="Internal notes..." className="font-mono text-xs h-8" />
                </div>
              </>
            )}
            {(actionType === "kick" || actionType === "warn") && (
              <div className="space-y-1">
                <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Reason</Label>
                <Input value={actionReason} onChange={e => setActionReason(e.target.value)} placeholder="Enter reason..." className="font-mono text-xs h-8" />
              </div>
            )}
            {actionType === "message" && (
              <div className="space-y-1">
                <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Message</Label>
                <Input value={actionMessage} onChange={e => setActionMessage(e.target.value)} placeholder="Enter message..." className="font-mono text-xs h-8" />
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-mono text-xs">CANCEL</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeAction}
              disabled={acting}
              className={actionType === "ban" || actionType === "kick" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 font-mono text-xs" : "font-mono text-xs"}
            >
              {acting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              EXECUTE {actionType?.toUpperCase()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
      </TabsContent>
      <TabsContent value="profiles" className="mt-0"><PlayerProfileManager onOpenProfile={() => setActiveTab("profiles")} /></TabsContent>
      <TabsContent value="bans" className="mt-0"><BanManager /></TabsContent>
    </Tabs>
  )
}
