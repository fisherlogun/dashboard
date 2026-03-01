"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/components/session-provider"
import { Button } from "@/components/ui/button"
import {
  RefreshCw, Server, Users, ShieldBan, Activity, Eye, ThumbsUp,
  ThumbsDown, Star, Cpu, Wifi, Power, AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then(r => r.json())

function StatCard({ label, value, icon: Icon, color = "text-primary", sub }: {
  label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color?: string; sub?: string
}) {
  return (
    <div className="border border-border bg-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className={`h-3.5 w-3.5 ${color}`} />
      </div>
      <span className={`font-mono text-2xl font-bold tabular-nums ${color}`}>{value}</span>
      {sub && <span className="font-mono text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  )
}

function MiniChart({ data }: { data: { player_count: number; recorded_at: string }[] }) {
  if (!data || data.length === 0) {
    return <div className="h-40 flex items-center justify-center text-muted-foreground font-mono text-xs">Awaiting telemetry data...</div>
  }
  const chartData = data.map(d => ({
    time: new Date(d.recorded_at).toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }),
    players: d.player_count,
    servers: d.server_count,
  }))

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="fillPlayers" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00e5ff" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#00e5ff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#5a6a7a", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 9, fill: "#5a6a7a", fontFamily: "monospace" }} axisLine={false} tickLine={false} width={30} />
        <Tooltip
          contentStyle={{ background: "#0f1420", border: "1px solid #1e293b", borderRadius: 0, fontFamily: "monospace", fontSize: 11 }}
          labelStyle={{ color: "#5a6a7a" }}
        />
        <Area type="monotone" dataKey="players" stroke="#00e5ff" fill="url(#fillPlayers)" strokeWidth={1.5} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { activeProject, projects, loading, setActiveProject } = useSession()
  const { data: stats, mutate, isLoading } = useSWR(
    activeProject ? `/api/stats?projectId=${activeProject.id}` : null,
    fetcher,
    { refreshInterval: 15000 }
  )

  const [shuttingDown, setShuttingDown] = useState(false)

  const handleShutdownAll = async () => {
    if (!activeProject) return
    if (!confirm("CONFIRM: Shutdown ALL servers? This will disconnect every player.")) return
    setShuttingDown(true)
    try {
      const res = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProject.id, action: "shutdown_all" }),
      })
      if (res.ok) toast.success("Shutdown command sent to all servers")
      else toast.error("Failed to send shutdown command")
    } catch { toast.error("Network error") }
    finally { setShuttingDown(false) }
  }

  if (!activeProject) {
    return (
      <div className="max-w-xl mx-auto mt-12 space-y-4">
        <div className="border border-border bg-card p-6">
          <h2 className="font-mono text-sm font-bold text-foreground mb-1">YOUR PROJECTS</h2>
          <p className="font-mono text-[10px] text-muted-foreground mb-4">
            Select a project to open, or create a new one.
          </p>

          {loading ? (
            <div className="flex items-center gap-2 py-6 justify-center">
              <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
              <span className="font-mono text-xs text-muted-foreground">Loading projects...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="border border-dashed border-border p-6 text-center">
              <Server className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
              <span className="font-mono text-xs text-muted-foreground block">No projects found.</span>
              <span className="font-mono text-[10px] text-muted-foreground block mt-1">
                Create your first project or ask an owner to add you.
              </span>
            </div>
          ) : (
            <div className="space-y-1">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveProject(p)
                    toast.success(`Switched to ${p.name}`)
                  }}
                  className="w-full flex items-center justify-between border border-border bg-background p-3 hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-2 w-2 bg-primary shrink-0" />
                    <div className="min-w-0">
                      <span className="font-mono text-xs text-foreground block truncate">{p.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground block">
                        UID:{p.universe_id} / PID:{p.place_id}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground shrink-0 ml-3">
                    {p.role}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          variant="outline"
          className="w-full font-mono text-xs h-10"
          onClick={() => router.push("/setup")}
        >
          + CREATE NEW PROJECT
        </Button>
      </div>
    )
  }

  const s = stats || {}
  const game = s.game

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 bg-success led-pulse" />
          <span className="font-mono text-xs text-foreground">{game?.name || activeProject.name}</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            UID:{activeProject.universe_id}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            className="font-mono text-[10px] h-7 gap-1.5"
            onClick={handleShutdownAll}
            disabled={shuttingDown || s.servers === 0}
          >
            <Power className="h-3 w-3" />
            {shuttingDown ? "SENDING..." : "SHUTDOWN ALL"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-[10px] h-7 gap-1.5"
            onClick={() => mutate()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            REFRESH
          </Button>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-border border border-border">
        <StatCard label="Servers" value={s.servers ?? 0} icon={Server} color="text-primary" sub={`${s.totalCapacity ?? 0} capacity`} />
        <StatCard label="Players" value={s.players ?? 0} icon={Users} color="text-chart-2" sub={game ? `${game.playing} via Roblox` : undefined} />
        <StatCard label="Avg FPS" value={s.avgFps ?? 0} icon={Cpu} color={s.avgFps >= 55 ? "text-chart-2" : s.avgFps >= 30 ? "text-warning" : "text-destructive"} />
        <StatCard label="Avg Ping" value={`${s.avgPing ?? 0}ms`} icon={Wifi} color={s.avgPing <= 100 ? "text-chart-2" : "text-warning"} />
        <StatCard label="Active Bans" value={s.activeBans ?? 0} icon={ShieldBan} color="text-destructive" sub={`${s.totalBans ?? 0} total`} />
        <StatCard label="Total Visits" value={game?.visits?.toLocaleString() ?? "0"} icon={Eye} color="text-primary" sub={game ? `${game.favoritedCount?.toLocaleString()} favs` : undefined} />
      </div>

      {/* Votes Row (if game data exists) */}
      {game && (
        <div className="grid grid-cols-3 gap-px bg-border border border-border">
          <div className="bg-card p-3 flex items-center gap-3">
            <ThumbsUp className="h-3.5 w-3.5 text-chart-2" />
            <span className="font-mono text-xs text-foreground">{game.upVotes?.toLocaleString()}</span>
            <span className="font-mono text-[10px] text-muted-foreground">likes</span>
          </div>
          <div className="bg-card p-3 flex items-center gap-3">
            <ThumbsDown className="h-3.5 w-3.5 text-destructive" />
            <span className="font-mono text-xs text-foreground">{game.downVotes?.toLocaleString()}</span>
            <span className="font-mono text-[10px] text-muted-foreground">dislikes</span>
          </div>
          <div className="bg-card p-3 flex items-center gap-3">
            <Star className="h-3.5 w-3.5 text-warning" />
            <span className="font-mono text-xs text-foreground">
              {game.upVotes && game.downVotes ? `${Math.round((game.upVotes / (game.upVotes + game.downVotes)) * 100)}%` : "N/A"}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">approval</span>
          </div>
        </div>
      )}

      {/* Chart + Activity Feed */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Player Telemetry</span>
            <Activity className="h-3 w-3 text-primary led-pulse" />
          </div>
          <MiniChart data={s.history ?? []} />
        </div>

        <div className="border border-border bg-card p-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block mb-3">Recent Activity</span>
          <div className="space-y-2 max-h-[180px] overflow-y-auto">
            {(s.recentLogs ?? []).length === 0 && (
              <span className="font-mono text-[10px] text-muted-foreground">No recent activity</span>
            )}
            {(s.recentLogs ?? []).map((log: Record<string, unknown>, i: number) => (
              <div key={i} className="flex items-start gap-2 pb-2 border-b border-border last:border-0">
                <div className={`h-1.5 w-1.5 mt-1.5 shrink-0 ${log.status === "success" ? "bg-success" : "bg-destructive"}`} />
                <div className="min-w-0">
                  <span className="font-mono text-[10px] text-foreground block truncate">{log.action as string}</span>
                  <span className="font-mono text-[9px] text-muted-foreground block truncate">{log.details as string}</span>
                  <span className="font-mono text-[9px] text-muted-foreground/50">
                    {log.created_at ? new Date(log.created_at as string).toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
