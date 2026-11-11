"use client"

import { useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Activity, Megaphone, RefreshCw, Sparkles, Waves } from "lucide-react"
import { useSession } from "@/components/session-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { FINDS_BY_ISLAND, GAME_EVENTS, ISLANDS, ISLAND_LABELS } from "@/lib/game-catalog"

interface EventServer {
  id: string
  event?: string | null
  event_name?: string | null
  event_ends?: number | null
  event_source?: string | null
}

interface EventOverview {
  settings: { autoEvents?: boolean; liveEvent?: { event: string; mult?: number; endsAt: number; message?: string } | null }
  servers: EventServer[]
  nextScheduledEvent?: { label: string; event: string; nextStart: number; minutes: number } | null
}

const fetcher = async (url: string): Promise<EventOverview> => {
  const response = await fetch(url, { cache: "no-store" })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || "Unable to load event controls")
  return result
}

function formatRemaining(endSeconds?: number | null) {
  if (!endSeconds) return "—"
  const remaining = Math.max(0, endSeconds - Math.floor(Date.now() / 1000))
  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const seconds = remaining % 60
  return hours ? `${hours}h ${minutes}m` : `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function EventsManager() {
  const { activeProject } = useSession()
  const projectId = activeProject?.id
  const { data, error, isLoading, isValidating, mutate } = useSWR<EventOverview>(
    projectId ? `/api/game-controls?action=overview&projectId=${encodeURIComponent(projectId)}` : null,
    fetcher,
    { refreshInterval: 15000 },
  )
  const [event, setEvent] = useState("cash2x")
  const [strength, setStrength] = useState("2")
  const [duration, setDuration] = useState("30")
  const [message, setMessage] = useState("")
  const [serverId, setServerId] = useState("all")
  const [island, setIsland] = useState("deep")
  const [sightingMinutes, setSightingMinutes] = useState("2.5")
  const [featuredItem, setFeaturedItem] = useState("golden_manta")
  const [featuredMinutes, setFeaturedMinutes] = useState("20")
  const [saving, setSaving] = useState(false)

  async function sendAction(action: Record<string, unknown>, success: string) {
    if (!projectId) return
    setSaving(true)
    try {
      const response = await fetch("/api/game-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, ...action }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "The action could not be sent")
      toast.success(success)
      await mutate()
      return true
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Network error")
      return false
    } finally {
      setSaving(false)
    }
  }

  const activeServers = (data?.servers ?? []).filter((server) => server.event && Number(server.event_ends) > Math.floor(Date.now() / 1000))
  const liveEvent = data?.settings?.liveEvent
  const eventName = GAME_EVENTS.find((item) => item.id === liveEvent?.event)?.name ?? liveEvent?.event ?? "Live event"
  const selectedEventName = GAME_EVENTS.find((item) => item.id === event)?.name ?? "Event"
  const allFinds = Object.entries(FINDS_BY_ISLAND)

  if (!projectId) return <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Select a project to manage game events.</div>

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2 text-primary"><Waves aria-hidden="true" className="size-4" /><span className="font-mono text-[10px] uppercase tracking-[0.18em]">Live game controls</span></div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">Control live multipliers, random rotation, sightings and featured finds.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void mutate()} disabled={isValidating}><RefreshCw data-icon="inline-start" className={isValidating ? "animate-spin" : ""} />Refresh</Button>
      </header>

      {error && <div role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error.message}</div>}

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div><CardTitle>Now running</CardTitle><CardDescription>Event state reported by live servers and shared settings.</CardDescription></div>
          <Badge variant={activeServers.length ? "default" : "secondary"}>{activeServers.length} / {data?.servers.length ?? 0} servers</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading server event state…</p> : activeServers.length ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {activeServers.map((server) => (
                  <div key={server.id} className="flex min-w-0 flex-col gap-2 rounded-lg border border-border/70 bg-background/60 p-4">
                    <div className="flex items-center justify-between gap-2"><Badge variant="outline">{server.event_source || "unknown"}</Badge><span className="font-mono text-xs text-primary">{formatRemaining(server.event_ends)}</span></div>
                    <p className="truncate text-sm font-semibold">{server.event_name || server.event}</p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground">{server.id}</p>
                  </div>
                ))}
              </div>
              {(liveEvent || activeServers.length > 0) && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary/5 px-4 py-3"><p className="text-sm"><span className="font-semibold">{liveEvent ? `${liveEvent.mult ?? 2}x ${eventName}` : activeServers[0]?.event_name || activeServers[0]?.event}</span><span className="ml-2 text-muted-foreground">{liveEvent ? `Dashboard event · ${formatRemaining(liveEvent.endsAt)}` : "Live server event"}</span></p><Button type="button" variant="destructive" size="sm" disabled={saving} onClick={() => void sendAction({ action: "stop-event" }, "Event stop sent")}>Stop event</Button></div>}
            </>
          ) : <div className="rounded-lg border border-dashed border-border p-6 text-center"><Activity aria-hidden="true" className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-sm font-medium">No event is active</p><p className="mt-1 text-xs text-muted-foreground">The random rotation or the next scheduled event can still start automatically.</p></div>}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="border-border/70 bg-card/80">
          <CardHeader><CardTitle>Start an event</CardTitle><CardDescription>All-server events are saved so new servers join the remaining time.</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2"><Label htmlFor="event-type">Event</Label><Select value={event} onValueChange={(value) => { setEvent(value); if (value === "frenzy") setStrength("3") }}><SelectTrigger id="event-type"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{GAME_EVENTS.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectGroup></SelectContent></Select></div>
              <div className="flex flex-col gap-2"><Label htmlFor="event-strength">Strength multiplier</Label><Input id="event-strength" type="number" min="1.5" max="10" step="0.5" value={strength} onChange={(e) => setStrength(e.target.value)} /><p className="text-xs text-muted-foreground">Displayed as {strength || "2"}x {selectedEventName}.</p></div>
              <div className="flex flex-col gap-2"><Label htmlFor="event-duration">Duration (minutes)</Label><Input id="event-duration" type="number" min="1" max="1440" value={duration} onChange={(e) => setDuration(e.target.value)} /><div className="flex flex-wrap gap-2">{[15, 30, 60, 120].map((value) => <Button key={value} type="button" size="sm" variant="outline" onClick={() => setDuration(String(value))}>{value} min</Button>)}</div></div>
              <div className="flex flex-col gap-2"><Label htmlFor="event-server">Target</Label><Select value={serverId} onValueChange={setServerId}><SelectTrigger id="event-server"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">All servers</SelectItem>{(data?.servers ?? []).map((server) => <SelectItem key={server.id} value={server.id}>{server.id.slice(0, 16)}</SelectItem>)}</SelectGroup></SelectContent></Select></div>
            </div>
            <div className="flex flex-col gap-2"><Label htmlFor="event-message">Optional player message</Label><Textarea id="event-message" value={message} maxLength={200} onChange={(e) => setMessage(e.target.value)} placeholder="A short message shown with the event card" /><span className="text-right text-xs text-muted-foreground">{message.length}/200</span></div>
            <Button type="button" disabled={saving} onClick={() => void sendAction({ action: "start-event", event, mult: Number(strength), minutes: Number(duration), message, ...(serverId !== "all" ? { serverId } : {}) }, "Event started")}>Start event</Button>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader><CardTitle>Random rotation</CardTitle><CardDescription>Automatic events run only when no dashboard event or scheduled event takes priority.</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-center justify-between rounded-lg border border-border/70 p-4"><div><p className="text-sm font-medium">Random events</p><p className="mt-1 text-xs text-muted-foreground">{data?.settings?.autoEvents === false ? "Disabled" : "Enabled"} · the game refreshes settings every 60 seconds.</p></div><Switch checked={data?.settings?.autoEvents !== false} disabled={saving || isLoading} aria-label="Enable random event rotation" onCheckedChange={(enabled) => void sendAction({ action: "auto-events", enabled }, enabled ? "Random event rotation enabled" : "Random event rotation disabled")} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-3 rounded-lg border border-border/70 p-4"><div className="flex items-center gap-2"><Sparkles aria-hidden="true" className="size-4 text-primary" /><h3 className="text-sm font-medium">Giant sighting</h3></div><div className="flex flex-col gap-2"><Label htmlFor="sighting-island">Island</Label><Select value={island} onValueChange={setIsland}><SelectTrigger id="sighting-island"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{ISLANDS.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectGroup></SelectContent></Select></div><div className="flex flex-col gap-2"><Label htmlFor="sighting-minutes">Minutes (0.5–60)</Label><Input id="sighting-minutes" type="number" min="0.5" max="60" step="0.5" value={sightingMinutes} onChange={(e) => setSightingMinutes(e.target.value)} /></div><Button type="button" variant="outline" disabled={saving} onClick={() => void sendAction({ action: "sighting", island, minutes: Number(sightingMinutes) }, `Giant sighting started at ${ISLAND_LABELS[island]}`)}>Start sighting</Button></div>
              <div className="flex flex-col gap-3 rounded-lg border border-border/70 p-4"><div className="flex items-center gap-2"><Megaphone aria-hidden="true" className="size-4 text-primary" /><h3 className="text-sm font-medium">Featured find</h3></div><div className="flex flex-col gap-2"><Label htmlFor="featured-find">Find</Label><Select value={featuredItem} onValueChange={setFeaturedItem}><SelectTrigger id="featured-find"><SelectValue /></SelectTrigger><SelectContent>{allFinds.map(([islandId, finds]) => <SelectGroup key={islandId}><SelectLabel>{ISLAND_LABELS[islandId]}</SelectLabel>{finds.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectGroup>)}</SelectContent></Select></div><div className="flex flex-col gap-2"><Label htmlFor="featured-minutes">Minutes (1–1440)</Label><Input id="featured-minutes" type="number" min="1" max="1440" value={featuredMinutes} onChange={(e) => setFeaturedMinutes(e.target.value)} /></div><Button type="button" variant="outline" disabled={saving} onClick={() => void sendAction({ action: "featured", item: featuredItem, minutes: Number(featuredMinutes) }, "Featured find set")}>Feature find</Button></div>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground"><span className="font-medium text-foreground">Next scheduled:</span> {data?.nextScheduledEvent ? `${data.nextScheduledEvent.label} · ${new Date(data.nextScheduledEvent.nextStart * 1000).toLocaleString()}` : "No enabled scheduled event"}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
