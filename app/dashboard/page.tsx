"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/components/session-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  RefreshCw, Server, Users, ShieldBan, Activity, Eye, ThumbsUp,
  ThumbsDown, Star, Cpu, Wifi, Power, AlertTriangle, Clock, TrendingUp, Zap,
} from "lucide-react"
import { toast } from "sonner"
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function DashboardPage() {
  const router = useRouter()
  const { activeProject, projects, loading, setActiveProject } = useSession()
  const { data, mutate, isLoading } = useSWR(
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
            </div>
          ) : (
            <div className="space-y-1">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setActiveProject(p); toast.success(`Switched to ${p.name}`) }}
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

  const stats = data || { servers: 0, players: 0, totalCapacity: 0, avgFps: 0, avgPing: 0, activeBans: 0, totalBans: 0, recentLogs: [], history: [], game: null }

  return (
    <div className="space-y-4">
      {/* Hero Section with Game Thumbnail */}
      <div
        className="relative border border-border overflow-hidden min-h-[280px] flex flex-col justify-between p-6 lg:p-8 group"
        style={{
          backgroundImage: stats.game?.thumbnail ? `linear-gradient(135deg, rgba(10, 14, 23, 0.85) 0%, rgba(10, 14, 23, 0.7) 50%, rgba(10, 14, 23, 0.85) 100%), url('${stats.game.thumbnail}')` : 'linear-gradient(135deg, #0a0e17 0%, #0f1420 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-destructive/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative z-10 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-mono text-2xl lg:text-3xl font-bold text-foreground mb-1">{stats.game?.name || activeProject.name}</h1>
              <p className="font-mono text-xs text-muted-foreground">
                {stats.game ? `Universe ${activeProject.universe_id} • Place ${activeProject.place_id}` : 'No game data available'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs h-8 gap-1"
              onClick={() => mutate()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              REFRESH
            </Button>
          </div>

          {stats.game && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-[10px] font-mono gap-1">
                <Eye className="h-2.5 w-2.5" /> {(stats.game.visits || 0).toLocaleString()} visits
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-mono gap-1">
                <Users className="h-2.5 w-2.5" /> {(stats.game.playing || 0).toLocaleString()} playing
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-mono gap-1">
                <Star className="h-2.5 w-2.5" /> {(stats.game.favoritedCount || 0).toLocaleString()} favorites
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-mono gap-1">
                <ThumbsUp className="h-2.5 w-2.5" /> {(stats.game.upVotes || 0).toLocaleString()}
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-mono gap-1">
                <ThumbsDown className="h-2.5 w-2.5" /> {(stats.game.downVotes || 0).toLocaleString()}
              </Badge>
            </div>
          )}
        </div>

        {/* Server Status Indicators */}
        <div className="relative z-10 flex flex-wrap gap-3">
          <div className="border border-primary/30 bg-primary/5 px-3 py-2">
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">SERVERS</div>
            <div className="text-lg font-mono font-bold text-primary mt-1">{stats.servers}</div>
          </div>
          <div className="border border-primary/30 bg-primary/5 px-3 py-2">
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">PLAYERS</div>
            <div className="text-lg font-mono font-bold text-primary mt-1">{stats.players}/{stats.totalCapacity}</div>
          </div>
          <div className="border border-primary/30 bg-primary/5 px-3 py-2">
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">AVG FPS</div>
            <div className={`text-lg font-mono font-bold mt-1 ${stats.avgFps >= 50 ? 'text-success' : stats.avgFps >= 30 ? 'text-warning' : 'text-destructive'}`}>{stats.avgFps.toFixed(1)}</div>
          </div>
          <div className="border border-primary/30 bg-primary/5 px-3 py-2">
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">AVG PING</div>
            <div className={`text-lg font-mono font-bold mt-1 ${stats.avgPing < 50 ? 'text-success' : stats.avgPing < 150 ? 'text-warning' : 'text-destructive'}`}>{Math.round(stats.avgPing)}ms</div>
          </div>
          <div className="border border-destructive/30 bg-destructive/5 px-3 py-2">
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">BANS</div>
            <div className="text-lg font-mono font-bold text-destructive mt-1">{stats.activeBans}</div>
          </div>
        </div>
      </div>

      {/* Telemetry Chart */}
      <div className="border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 text-primary" /> PLAYER TELEMETRY (3H)
          </h2>
          <span className="font-mono text-[10px] text-muted-foreground">{stats.history.length} data points</span>
        </div>
        {!stats.history || stats.history.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground font-mono text-xs">Awaiting telemetry data...</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats.history.reverse()}>
              <defs>
                <linearGradient id="colorPlayers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00e5ff" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00e5ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="recorded_at"
                stroke="#5a6a7a"
                style={{ fontSize: "11px", fontFamily: "monospace" }}
                tickFormatter={(value) =>
                  new Date(value).toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
                }
              />
              <YAxis stroke="#5a6a7a" style={{ fontSize: "11px", fontFamily: "monospace" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f1420", border: "1px solid #1e293b", borderRadius: "0px" }}
                labelStyle={{ color: "#c8d6e5", fontFamily: "monospace", fontSize: "12px" }}
                formatter={(value) => [value, "Players"]}
                labelFormatter={(label) =>
                  new Date(label).toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
                }
              />
              <Area
                type="monotone"
                dataKey="player_count"
                stroke="#00e5ff"
                fillOpacity={1}
                fill="url(#colorPlayers)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent Activity */}
      <div className="border border-border bg-card p-4 space-y-3">
        <h2 className="text-xs font-mono font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="h-3 w-3 text-primary" /> RECENT ACTIVITY
        </h2>
        <div className="space-y-1">
          {!stats.recentLogs || stats.recentLogs.length === 0 ? (
            <p className="text-xs font-mono text-muted-foreground text-center py-4">NO_RECENT_ACTIVITY</p>
          ) : (
            stats.recentLogs.slice(0, 8).map((log: any, idx: number) => (
              <div key={idx} className="border border-border/50 bg-background p-2 flex items-start justify-between gap-2 text-[10px] font-mono">
                <div className="flex-1 min-w-0">
                  <span className="text-foreground font-bold">{log.action}</span>
                  <span className="text-muted-foreground mx-1">•</span>
                  <span className="text-muted-foreground truncate">{log.user_name}</span>
                </div>
                <span className="text-muted-foreground/50 shrink-0">
                  {new Date(log.created_at).toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button
          variant="destructive"
          className="flex-1 font-mono text-xs uppercase tracking-wider h-9 gap-1.5"
          onClick={handleShutdownAll}
          disabled={shuttingDown || stats.servers === 0}
        >
          {shuttingDown ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Power className="h-3 w-3" />}
          SHUTDOWN ALL SERVERS
        </Button>
      </div>
    </div>
  )
}
