"use client"

import useSWR from "swr"
import Link from "next/link"
import { useSession } from "@/components/session-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, ArrowUpRight, Ban, CalendarClock, Gauge, RefreshCw, Server, ShieldCheck, Signal, Sparkles, Users, Waves } from "lucide-react"
import { MetricCard } from "@/components/dashboard/overview/metric-card"
import { PlayerHistoryChart, type HistoryPoint } from "@/components/dashboard/overview/player-history-chart"
import { RecentJoins, type JoinEvent } from "@/components/dashboard/overview/recent-joins"

interface EventOverview {
  settings?: { liveEvent?: { event: string; mult?: number; endsAt: number; message?: string } | null }
  servers: Array<{ id: string; event?: string | null; event_name?: string | null; event_ends?: number | null; event_source?: string | null }>
  nextScheduledEvent?: { label: string; event: string; nextStart: number; minutes: number } | null
}

async function fetchEventOverview(url: string): Promise<EventOverview> {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error("Unable to load event overview")
  return response.json()
}

interface DashboardStats {
  servers: number
  players: number
  totalCapacity: number
  avgFps: number
  avgPing: number
  activeBans: number
  totalBans: number
  recentLogs: JoinEvent[]
  history: HistoryPoint[]
  lastHeartbeatAt: string | null
  game: {
    name: string
    playing: number
    visits: number
    favoritedCount: number
    upVotes: number
    downVotes: number
    maxPlayers: number
    thumbnail: string | null
  } | null
}

function formatHeartbeatAge(seconds: number) {
  if (seconds < 60) return `${seconds} seconds ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  return `${Math.floor(seconds / 3600)} hours ago`
}

async function fetchStats(url: string): Promise<DashboardStats> {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error("Unable to load game telemetry")
  return response.json()
}

export function OverviewDashboard() {
  const { activeProject, loading: sessionLoading } = useSession()
  const { data, error, isLoading, isValidating, mutate } = useSWR<DashboardStats>(
    activeProject ? `/api/stats?projectId=${encodeURIComponent(activeProject.id)}` : null,
    fetchStats,
    { refreshInterval: 10_000, revalidateOnFocus: true, keepPreviousData: true },
  )
  const { data: eventOverview } = useSWR<EventOverview>(
    activeProject ? `/api/game-controls?action=overview&projectId=${encodeURIComponent(activeProject.id)}` : null,
    fetchEventOverview,
    { refreshInterval: 15_000, revalidateOnFocus: true },
  )

  async function shutDownAllServers() {
    if (!activeProject || !window.confirm("Shut down every live Scuba Simulator server?")) return
    const response = await fetch("/api/servers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: activeProject.id, action: "shutdown_all", message: "Owner initiated shutdown" }),
    })
    if (!response.ok) {
      window.alert("The shutdown command could not be sent. Check the Roblox Open Cloud key and MessagingService permissions.")
      return
    }
    await mutate()
  }

  if (sessionLoading || (!activeProject && !error && isLoading)) {
    return <div className="h-72 animate-pulse rounded-2xl border border-border/60 bg-muted/30" aria-label="Loading private game data" />
  }

  if (!activeProject) {
    return (
      <Card className="mx-auto mt-12 max-w-2xl border-border/70">
        <CardHeader>
          <CardTitle>Scuba Simulator is not linked</CardTitle>
          <CardDescription>The owner session is valid, but no game project was returned.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Open Private settings to check the game binding.</CardContent>
      </Card>
    )
  }

  const history = data?.history ?? []
  const recentJoins = data?.recentLogs ?? []
  const lastHeartbeatTime = data?.lastHeartbeatAt ? Date.parse(data.lastHeartbeatAt) : Number.NaN
  const heartbeatAgeSeconds = Number.isFinite(lastHeartbeatTime)
    ? Math.max(0, Math.floor((Date.now() - lastHeartbeatTime) / 1000))
    : null
  const gameName = data?.game?.name || activeProject.name || "Scuba Simulator"

  return (
    <div className="flex flex-col gap-6 sm:gap-7">
      <section className="relative isolate overflow-hidden rounded-2xl border border-border/70 bg-card">
        {data?.game?.thumbnail && (
          <img
            src={data.game.thumbnail}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 size-full object-cover opacity-30 blur-[1px]"
          />
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/55" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1.5 border-primary/30 bg-background/50 text-primary">
                <ShieldCheck aria-hidden="true" className="size-3" /> PRIVATE OWNER CONSOLE
              </Badge>
              <Badge variant="secondary" className="font-mono text-[10px] tracking-wide">UNIVERSE {activeProject.universe_id}</Badge>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Waves aria-hidden="true" className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Experience control</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{gameName}</h1>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">Live servers, players, moderation and game data in one owner-only workspace.</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className={`size-1.5 rounded-full ${error ? "bg-destructive" : data?.servers ? "bg-primary" : "bg-muted-foreground"}`} />{error ? "TELEMETRY ERROR" : data?.servers ? "LIVE RELAY" : heartbeatAgeSeconds === null ? "NO RELAY HISTORY" : "NO LIVE SERVERS"}</span>
              {data?.game && <span>{data.game.playing.toLocaleString()} playing on Roblox</span>}
              <a href="https://www.roblox.com/games/139373122825390/Scuba-Simulator" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                Open experience <ArrowUpRight aria-hidden="true" className="size-3" />
              </a>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void mutate()} disabled={isValidating}>
              <RefreshCw data-icon="inline-start" className={isValidating ? "animate-spin" : ""} />
              Refresh
            </Button>
            <Button type="button" variant="destructive" onClick={() => void shutDownAllServers()} disabled={!data?.servers}>
              <Server data-icon="inline-start" /> Shut down all
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Telemetry could not refresh. The dashboard remains private; check the database connection and relay status.
        </div>
      )}

      <section aria-label="Live game metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <MetricCard label="Live players" value={data?.players ?? 0} detail={`${data?.servers ?? 0} server${data?.servers === 1 ? "" : "s"} reporting`} icon={Users} />
        <MetricCard label="Live servers" value={data?.servers ?? 0} detail={`${data?.totalCapacity ?? 0} total slots`} icon={Server} />
        <MetricCard label="Average FPS" value={data?.avgFps ? data.avgFps.toFixed(1) : "—"} detail="Across live servers" icon={Gauge} />
        <MetricCard label="Average ping" value={data?.avgPing ? `${Math.round(data.avgPing)} ms` : "—"} detail="Player network latency" icon={Signal} />
        <MetricCard label="Active bans" value={data?.activeBans ?? 0} detail={`${data?.totalBans ?? 0} total records`} icon={Ban} />
      </section>

      {data && data.servers === 0 && !error && (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/25 bg-warning/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-sm font-medium">
              {heartbeatAgeSeconds === null ? "No relay heartbeat has ever been recorded" : "No server is currently reporting"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {heartbeatAgeSeconds === null
                ? "This project has no prior server signal. If a live server should be online, verify the Scuba Simulator place binding and the relay settings in the private console."
                : heartbeatAgeSeconds <= 45
                  ? `A server heartbeat was stored ${formatHeartbeatAge(heartbeatAgeSeconds)}, but no server is in the live 45-second window. Check the place binding and relay configuration if that server should still be running.`
                  : `The last server heartbeat was ${formatHeartbeatAge(heartbeatAgeSeconds)}. The server is stale or shut down; if it should be online, inspect the server script output and Roblox HTTP settings.`}
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/dashboard/settings">Review relay settings <ArrowUpRight data-icon="inline-end" /></Link>
          </Button>
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0"><div><CardTitle className="flex items-center gap-2 text-base"><Sparkles aria-hidden="true" className="size-4 text-primary" />Current game event</CardTitle><CardDescription>Event and source reported by each live server</CardDescription></div><Button asChild variant="outline" size="sm"><Link href="/dashboard/events">Manage</Link></Button></CardHeader>
          <CardContent>{(eventOverview?.servers ?? []).some((server) => server.event) ? <div className="flex flex-col gap-2">{eventOverview?.servers.filter((server) => server.event).map((server) => <div key={server.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"><div className="min-w-0"><p className="truncate text-sm font-medium">{server.event_name || server.event}</p><p className="font-mono text-[10px] text-muted-foreground">{server.event_source || "unknown"} · {server.id.slice(0, 12)}</p></div><Badge variant="outline">{server.event_ends ? `${Math.max(0, Math.floor((server.event_ends - Date.now() / 1000) / 60))}m left` : "Active"}</Badge></div>)}</div> : <p className="text-sm text-muted-foreground">No event currently reported by live servers.</p>}</CardContent>
        </Card>
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0"><div><CardTitle className="flex items-center gap-2 text-base"><CalendarClock aria-hidden="true" className="size-4 text-primary" />Next scheduled event</CardTitle><CardDescription>Calculated from the shared UTC schedule</CardDescription></div><Button asChild variant="outline" size="sm"><Link href="/dashboard/events">Calendar</Link></Button></CardHeader>
          <CardContent>{eventOverview?.nextScheduledEvent ? <div className="rounded-md border border-border/60 px-3 py-3"><p className="font-medium">{eventOverview.nextScheduledEvent.label}</p><p className="mt-1 text-sm text-muted-foreground">{eventOverview.nextScheduledEvent.event} · {eventOverview.nextScheduledEvent.minutes} min</p><p className="mt-2 font-mono text-xs text-primary">{new Date(eventOverview.nextScheduledEvent.nextStart * 1000).toLocaleString()}</p></div> : <p className="text-sm text-muted-foreground">No enabled event is scheduled.</p>}</CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]">
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-base">Player history</CardTitle>
              <CardDescription>Server-reported concurrent players · refreshed every 10 seconds</CardDescription>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-border/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              <Activity aria-hidden="true" className="size-3 text-primary" /> 3h window
            </div>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="flex h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-border text-center">
                <Activity aria-hidden="true" className="size-5 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">No telemetry history yet</p>
                <p className="mt-1 text-xs text-muted-foreground">The chart begins after the first live heartbeat.</p>
              </div>
            ) : (
              <PlayerHistoryChart history={history} />
            )}
          </CardContent>
        </Card>
        <RecentJoins events={recentJoins} />
      </section>

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Roblox experience snapshot</CardTitle>
          <CardDescription>Public experience metrics, separate from live server telemetry</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Visits</p><p className="mt-1 text-lg font-semibold tabular-nums">{data?.game?.visits?.toLocaleString() ?? "—"}</p></div>
          <div><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Favorites</p><p className="mt-1 text-lg font-semibold tabular-nums">{data?.game?.favoritedCount?.toLocaleString() ?? "—"}</p></div>
          <div><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Upvotes</p><p className="mt-1 text-lg font-semibold tabular-nums">{data?.game?.upVotes?.toLocaleString() ?? "—"}</p></div>
          <div><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Downvotes</p><p className="mt-1 text-lg font-semibold tabular-nums">{data?.game?.downVotes?.toLocaleString() ?? "—"}</p></div>
        </CardContent>
      </Card>
    </div>
  )
}
