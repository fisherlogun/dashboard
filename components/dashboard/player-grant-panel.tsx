"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Gift, Loader2 } from "lucide-react"
import { useSession } from "@/components/session-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BREWS, FINDS_BY_ISLAND, GEAR_BY_SLOT, ISLANDS, VARIANTS } from "@/lib/game-catalog"

type GrantType = "cash" | "set_cash" | "xp" | "level" | "island" | "brew" | "gear" | "find"

interface PlayerGrantPanelProps {
  userId: string
  displayName: string
  onGranted?: () => void
  quickActions?: boolean
  currentIsland?: string | null
}

export function PlayerGrantPanel({ userId, displayName, onGranted, quickActions = false, currentIsland }: PlayerGrantPanelProps) {
  const { activeProject } = useSession()
  const [type, setType] = useState<GrantType>("cash")
  const [amount, setAmount] = useState("1000")
  const [level, setLevel] = useState("1")
  const [island, setIsland] = useState("reef")
  const [brew, setBrew] = useState("luck")
  const [minutes, setMinutes] = useState("30")
  const [gearItem, setGearItem] = useState("tank_1")
  const [findItem, setFindItem] = useState("pink_scallop")
  const [equip, setEquip] = useState(false)
  const [count, setCount] = useState("1")
  const [variant, setVariant] = useState("")
  const [note, setNote] = useState("")
  const [sending, setSending] = useState(false)

  const allFinds = Object.entries(FINDS_BY_ISLAND)
  const allGear = Object.entries(GEAR_BY_SLOT)

  async function queueGrant(grant: Record<string, unknown>) {
    if (!activeProject || sending) return
    setSending(true)
    try {
      const response = await fetch("/api/player-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProject.id, action: "grant", userId, requestId: crypto.randomUUID(), grant: { ...grant, note: note.trim() } }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Grant could not be saved")
      toast.success(result.delivered ? "Player change queued" : "Grant saved; the game server will pick it up shortly")
      setNote("")
      onGranted?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Network error")
    } finally {
      setSending(false)
    }
  }

  async function submit() {
    if ((type === "set_cash" || type === "level" || (type === "cash" && Number(amount) < -1000)) && !window.confirm(`Confirm ${type === "cash" ? "large cash removal" : type === "level" ? "level change" : "exact cash reset"} for ${displayName}?`)) return
    const grant: Record<string, unknown> = { type, note: note.trim() }
    if (["cash", "set_cash", "xp"].includes(type)) grant.amount = Number(amount)
    if (type === "level") grant.level = Number(level)
    if (type === "island") grant.island = island
    if (type === "brew") { grant.brew = brew; grant.minutes = Number(minutes) }
    if (type === "gear") { grant.item = gearItem; grant.equip = equip }
    if (type === "find") { grant.item = findItem; grant.count = Number(count); grant.variant = variant }
    await queueGrant(grant)
  }

  const islandIndex = ISLANDS.findIndex((item) => item.id === currentIsland)
  const nextIsland = ISLANDS[islandIndex + 1]

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader><CardTitle className="flex items-center gap-2"><Gift aria-hidden="true" className="size-4 text-primary" />Give / change</CardTitle><CardDescription>Queue a one-time change for {displayName}. Online changes use the same pending-grant flow.</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FieldGroup className="gap-4">
          <Field><FieldLabel htmlFor={`grant-type-${userId}`}>Change type</FieldLabel><Select value={type} onValueChange={(value) => setType(value as GrantType)}><SelectTrigger id={`grant-type-${userId}`}><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="cash">Add / remove cash</SelectItem><SelectItem value="set_cash">Set exact cash</SelectItem><SelectItem value="xp">Add XP</SelectItem><SelectItem value="level">Set level</SelectItem><SelectItem value="island">Unlock island</SelectItem><SelectItem value="brew">Give brew</SelectItem><SelectItem value="gear">Give gear</SelectItem><SelectItem value="find">Give find</SelectItem></SelectGroup></SelectContent></Select></Field>
          {(["cash", "set_cash", "xp"].includes(type)) && <Field><FieldLabel htmlFor={`grant-amount-${userId}`}>{type === "cash" ? "Cash amount · negative removes" : type === "xp" ? "XP amount" : "New cash amount"}</FieldLabel><Input id={`grant-amount-${userId}`} type="number" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>}
          {type === "level" && <Field><FieldLabel htmlFor={`grant-level-${userId}`}>New level (1–999)</FieldLabel><Input id={`grant-level-${userId}`} type="number" min="1" max="999" value={level} onChange={(event) => setLevel(event.target.value)} /></Field>}
          {type === "island" && <Field><FieldLabel htmlFor={`grant-island-${userId}`}>Island to unlock</FieldLabel><Select value={island} onValueChange={setIsland}><SelectTrigger id={`grant-island-${userId}`}><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{ISLANDS.map((option) => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>}
          {type === "brew" && <div className="grid gap-3 sm:grid-cols-2"><Field><FieldLabel htmlFor={`grant-brew-${userId}`}>Brew</FieldLabel><Select value={brew} onValueChange={setBrew}><SelectTrigger id={`grant-brew-${userId}`}><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{BREWS.map((option) => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}</SelectGroup></SelectContent></Select></Field><Field><FieldLabel htmlFor={`grant-brew-minutes-${userId}`}>Minutes (1–60)</FieldLabel><Input id={`grant-brew-minutes-${userId}`} type="number" min="1" max="60" value={minutes} onChange={(event) => setMinutes(event.target.value)} /></Field></div>}
          {type === "gear" && <><Field><FieldLabel htmlFor={`grant-gear-${userId}`}>Gear</FieldLabel><Select value={gearItem} onValueChange={setGearItem}><SelectTrigger id={`grant-gear-${userId}`}><SelectValue /></SelectTrigger><SelectContent>{allGear.map(([slot, gear]) => <SelectGroup key={slot}><SelectLabel>{slot}</SelectLabel>{gear.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectGroup>)}</SelectContent></Select></Field><label className="flex items-center gap-2 text-sm"><Checkbox checked={equip} onCheckedChange={(checked) => setEquip(checked === true)} />Equip this item when granted</label></>}
          {type === "find" && <><Field><FieldLabel htmlFor={`grant-find-${userId}`}>Find</FieldLabel><Select value={findItem} onValueChange={setFindItem}><SelectTrigger id={`grant-find-${userId}`}><SelectValue /></SelectTrigger><SelectContent>{allFinds.map(([islandId, finds]) => <SelectGroup key={islandId}><SelectLabel>{islandId}</SelectLabel>{finds.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectGroup>)}</SelectContent></Select></Field><div className="grid gap-3 sm:grid-cols-2"><Field><FieldLabel htmlFor={`grant-find-count-${userId}`}>Count (1–1,000)</FieldLabel><Input id={`grant-find-count-${userId}`} type="number" min="1" max="1000" value={count} onChange={(event) => setCount(event.target.value)} /></Field><Field><FieldLabel htmlFor={`grant-variant-${userId}`}>Variant</FieldLabel><Select value={variant || "normal"} onValueChange={(value) => setVariant(value === "normal" ? "" : value)}><SelectTrigger id={`grant-variant-${userId}`}><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="normal">Normal</SelectItem>{VARIANTS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectGroup></SelectContent></Select></Field></div></>}
          <Field><FieldLabel htmlFor={`grant-note-${userId}`}>Audit note (optional)</FieldLabel><Input id={`grant-note-${userId}`} value={note} onChange={(event) => setNote(event.target.value)} maxLength={180} placeholder="Refund, support fix, event reward…" /></Field>
        </FieldGroup>
        {quickActions && <div className="flex flex-col gap-2 border-t border-border/60 pt-4"><p className="text-xs font-medium text-muted-foreground">Quick actions</p><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => void queueGrant({ type: "cash", amount: 1000 })} disabled={sending || !activeProject}>+$1,000</Button><Button type="button" variant="outline" size="sm" onClick={() => void queueGrant({ type: "cash", amount: 10000 })} disabled={sending || !activeProject}>+$10,000</Button><Button type="button" variant="outline" size="sm" onClick={() => void queueGrant({ type: "brew", brew: "luck", minutes: 30 })} disabled={sending || !activeProject}>30 min Luck brew</Button>{nextIsland && <Button type="button" variant="outline" size="sm" onClick={() => void queueGrant({ type: "island", island: nextIsland.id })} disabled={sending || !activeProject}>Unlock {nextIsland.name}</Button>}</div></div>}
        <Button type="button" onClick={() => void submit()} disabled={sending || !activeProject}>{sending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Gift data-icon="inline-start" />}Queue player change</Button>
      </CardContent>
    </Card>
  )
}

interface PlayerGrantDialogProps extends PlayerGrantPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PlayerGrantDialog({ userId, displayName, open, onOpenChange, onGranted }: PlayerGrantDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Player tools · {displayName}</DialogTitle><DialogDescription>Queue safe, exactly-once changes for Roblox user {userId}.</DialogDescription></DialogHeader>
        <PlayerGrantPanel userId={userId} displayName={displayName} onGranted={onGranted} />
      </DialogContent>
    </Dialog>
  )
}
