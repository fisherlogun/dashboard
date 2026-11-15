"use client"

import { useState } from "react"
import useSWR from "swr"
import { Activity, Clock3, Repeat2, Users, CalendarDays } from "lucide-react"
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts"
import { useSession } from "@/components/session-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { formatEasternDateTime } from "@/lib/time-format"

type Analytics = {
  summary: { sessions?: number; unique_players?: number; dau?: number; wau?: number; mau?: number; returning_sessions?: number; avg_session_seconds?: number }
  daily: Array<{ day: string; players: number; sessions: number; returning_players: number; avg_session_seconds: number }>
  topPlayers: Array<{ roblox_user_id: string; username: string; display_name: string; avatar_url: string | null; sessions: number; last_seen_at: string; avg_session_seconds: number }>
}

async function fetchAnalytics(url: string): Promise<Analytics> {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error("Unable to load player analytics")
  return response.json()
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—"
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof Users }) {
  return <Card className="border-border/70 bg-card/80"><CardContent className="p-4 sm:p-5"><div className="flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</span><Icon aria-hidden="true" className="size-4 text-primary" /></div><p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>
}

export function AnalyticsDashboard() {
  const { activeProject, loading } = useSession()
  const [days, setDays] = useState(30)
  const { data, error, isLoading } = useSWR<Analytics>(
    activeProject ? `/api/analytics?projectId=${encodeURIComponent(activeProject.id)}&days=${days}` : null,
    fetchAnalytics,
    { refreshInterval: 60_000, revalidateOnFocus: true },
  )

  if (loading || (!data && isLoading)) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
  if (!activeProject) return <p className="rounded-lg border border-border p-6 text-sm text-muted-foreground">Choose a game project to view analytics.</p>
  const summary = data?.summary ?? {}
  const returnRate = summary.sessions ? Math.round((summary.returning_sessions ?? 0) / summary.sessions * 100) : 0
  const daily = data?.daily ?? []

  return <div className="flex flex-col gap-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-primary"><Activity aria-hidden="true" className="size-3.5" /> Player intelligence</div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Game analytics</h1><p className="mt-1 text-sm text-muted-foreground">Understand who plays, how long they stay, and whether they return.</p></div>
      <div className="flex gap-2" aria-label="Analytics date range">{[7, 30, 90].map((range) => <Button key={range} variant={days === range ? "default" : "outline"} size="sm" onClick={() => setDays(range)} aria-pressed={days === range}>{range} days</Button>)}</div>
    </header>
    {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">Player analytics could not be loaded. Check the connection and try again.</p>}
    <section aria-label="Player summary metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Metric label="Daily active" value={summary.dau ?? 0} detail="Unique players in the last 24h" icon={Users} />
      <Metric label="Weekly active" value={summary.wau ?? 0} detail="Unique players in the last 7 days" icon={CalendarDays} />
      <Metric label="Avg. play time" value={formatDuration(summary.avg_session_seconds ?? 0)} detail="Per session in the last 30 days" icon={Clock3} />
      <Metric label="Returning sessions" value={`${returnRate}%`} detail={`${summary.returning_sessions ?? 0} of ${summary.sessions ?? 0} sessions` } icon={Repeat2} />
    </section>
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.8fr)]">
      <Card className="border-border/70 bg-card/80">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0"><div><CardTitle className="text-base">Player activity</CardTitle><CardDescription>Daily unique players and returning players · {days}-day window</CardDescription></div><span className="rounded border border-border/70 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">UTC dates</span></CardHeader>
        <CardContent>{daily.length ? <ChartContainer config={{ players: { label: "Unique players", color: "var(--chart-1)" }, returning_players: { label: "Returning players", color: "var(--chart-2)" } }} className="h-[280px] w-full aspect-auto"><AreaChart data={daily} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={10} minTickGap={24} tickFormatter={(value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} /><Tooltip labelFormatter={(value) => new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, { month: "long", day: "numeric", timeZone: "UTC" })} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)" }} /><Area type="monotone" dataKey="players" name="Unique players" stroke="var(--color-players)" fill="var(--color-players)" fillOpacity={0.12} strokeWidth={2} /><Area type="monotone" dataKey="returning_players" name="Returning players" stroke="var(--color-returning_players)" fill="var(--color-returning_players)" fillOpacity={0.05} strokeWidth={2} /></AreaChart></ChartContainer> : <div className="flex h-[280px] flex-col items-center justify-center rounded-md border border-dashed border-border text-center"><Activity aria-hidden="true" className="size-5 text-muted-foreground" /><p className="mt-3 text-sm font-medium">No session data yet</p><p className="mt-1 max-w-sm text-xs text-muted-foreground">Player activity will appear after your relay reports joins and leaves.</p></div>}</CardContent>
      </Card>
      <Card className="border-border/70 bg-card/80"><CardHeader><CardTitle className="text-base">Returning audience</CardTitle><CardDescription>Unique players active in each period</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between border-b border-border/60 pb-3"><span className="text-sm text-muted-foreground">Daily active</span><strong className="font-mono text-lg tabular-nums">{summary.dau ?? 0}</strong></div><div className="flex items-center justify-between border-b border-border/60 pb-3"><span className="text-sm text-muted-foreground">Weekly active</span><strong className="font-mono text-lg tabular-nums">{summary.wau ?? 0}</strong></div><div className="flex items-center justify-between border-b border-border/60 pb-3"><span className="text-sm text-muted-foreground">Monthly active</span><strong className="font-mono text-lg tabular-nums">{summary.mau ?? 0}</strong></div><div className="rounded-md border border-primary/20 bg-primary/5 p-3"><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-primary">Repeat visit signal</p><p className="mt-1 text-2xl font-semibold tabular-nums">{returnRate}%</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Sessions started by players with an earlier recorded session during this period.</p></div></CardContent></Card>
    </section>
    <Card className="border-border/70 bg-card/80"><CardHeader><CardTitle className="text-base">Most engaged players</CardTitle><CardDescription>Ranked by recorded sessions in the selected period</CardDescription></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead><tr className="border-b border-border/70 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground"><th className="pb-3 font-medium">Player</th><th className="pb-3 font-medium">Sessions</th><th className="pb-3 font-medium">Avg. play time</th><th className="pb-3 font-medium">Last seen</th></tr></thead><tbody>{(data?.topPlayers ?? []).map((player) => <tr key={player.roblox_user_id} className="border-b border-border/40 last:border-0"><td className="py-3"><div className="flex items-center gap-3"><div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-xs font-semibold">{player.avatar_url ? <img src={player.avatar_url} alt="" className="size-full object-cover" /> : (player.display_name || player.username || "?").slice(0, 1)}</div><div><p className="font-medium">{player.display_name || player.username}</p><p className="font-mono text-[10px] text-muted-foreground">@{player.username} · {player.roblox_user_id}</p></div></div></td><td className="py-3 font-mono tabular-nums">{player.sessions}</td><td className="py-3 font-mono tabular-nums">{formatDuration(player.avg_session_seconds)}</td><td className="py-3 text-muted-foreground">{formatEasternDateTime(player.last_seen_at, { hour: undefined, minute: undefined, timeZoneName: undefined })}</td></tr>)}</tbody></table>{(data?.topPlayers ?? []).length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Player sessions will appear here once your game relay sends join data.</p>}</div></CardContent></Card>
    <p className="text-xs text-muted-foreground">These metrics are based on relay-observed player sessions. Retention and play time build from the first session tracked after analytics was enabled.</p>
  </div>
}
