"use client"

import { useState } from "react"
import { useSession } from "@/components/session-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Server, Users, RefreshCw, Wifi, Cpu, Power, ChevronDown, ChevronUp,
  Megaphone, Send, Loader2, AlertTriangle, Clock,
} from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface ServerPlayer {
  user_id: string
  display_name: string
  username: string
  play_time: number
  avatar_url: string
}

interface ServerData {
  id: string
  players: number
  max_players: number
  fps: number
  ping: number
  uptime: number
  last_heartbeat: string
  playerList: ServerPlayer[]
}

export default function ServersPage() {
  const { activeProject } = useSession()
  const { data, mutate, isLoading } = useSWR(
    activeProject ? `/api/servers?projectId=${activeProject.id}` : null,
    fetcher,
    { refreshInterval: 15000 }
  )

  const [expanded, setExpanded] = useState<string | null>(null)
  const [shutdownTarget, setShutdownTarget] = useState<ServerData | null>(null)
  const [shuttingDown, setShuttingDown] = useState(false)
  const [announceMsg, setAnnounceMsg] = useState("")
  const [announcing, setAnnouncing] = useState(false)

  const servers: ServerData[] = data?.servers ?? []
  const totalPlayers = servers.reduce((s, sv) => s + sv.players, 0)
  const totalCapacity = servers.reduce((s, sv) => s + sv.max_players, 0)

  const handleShutdown = async () => {
    if (!shutdownTarget || !activeProject) return
    setShuttingDown(true)
    try {
      const res = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProject.id, action: "shutdown_server", serverId: shutdownTarget.id }),
      })
      if (res.ok) toast.success(`Shutdown sent to ${shutdownTarget.id.slice(0, 8)}`)
      else toast.error("Failed")
    } catch { toast.error("Network error") }
    finally { setShuttingDown(false); setShutdownTarget(null) }
  }

  const handleAnnounce = async (serverId: string) => {
    if (!announceMsg.trim() || !activeProject) return
    setAnnouncing(true)
    try {
      const res = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProject.id, action: "announce", serverId, message: announceMsg.trim() }),
      })
      if (res.ok) { toast.success("Announcement sent"); setAnnounceMsg("") }
      else toast.error("Failed")
    } catch { toast.error("Network error") }
    finally { setAnnouncing(false) }
  }

  const formatUptime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="h-4 w-4 text-primary" />
          <span className="font-mono text-xs text-foreground">{servers.length} LIVE SERVERS</span>
          <span className="font-mono text-[10px] text-muted-foreground">{totalPlayers}/{totalCapacity} players</span>
        </div>
        <Button variant="outline" size="sm" className="font-mono text-[10px] h-7 gap-1.5" onClick={() => mutate()} disabled={isLoading}>
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          REFRESH
        </Button>
      </div>

      {/* Server List */}
      {isLoading ? (
        <div className="space-y-1">
          {[1,2,3].map(i => <div key={i} className="h-20 animate-pulse bg-card border border-border" />)}
        </div>
      ) : servers.length === 0 ? (
        <div className="border border-border bg-card p-12 text-center">
          <Server className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <span className="font-mono text-xs text-muted-foreground block">No servers currently online</span>
          <span className="font-mono text-[10px] text-muted-foreground/60 block mt-1">Servers appear when the Lua heartbeat script sends data</span>
        </div>
      ) : (
        <div className="space-y-1">
          {servers.map(server => {
            const isOpen = expanded === server.id
            const fillPct = server.max_players > 0 ? Math.round((server.players / server.max_players) * 100) : 0
            const fpsColor = server.fps >= 55 ? "text-success" : server.fps >= 30 ? "text-warning" : "text-destructive"
            const pingColor = server.ping <= 100 ? "text-success" : server.ping <= 200 ? "text-warning" : "text-destructive"

            return (
              <div key={server.id} className="border border-border bg-card">
                {/* Row */}
                <button
                  onClick={() => setExpanded(isOpen ? null : server.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="h-2.5 w-2.5 bg-success led-pulse shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-xs text-foreground truncate block">{server.id}</span>
                      <div className="flex items-center gap-4 mt-0.5">
                        <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />{server.players}/{server.max_players}
                        </span>
                        <span className={`font-mono text-[10px] flex items-center gap-1 ${fpsColor}`}>
                          <Cpu className="h-3 w-3" />{server.fps} FPS
                        </span>
                        <span className={`font-mono text-[10px] flex items-center gap-1 ${pingColor}`}>
                          <Wifi className="h-3 w-3" />{server.ping}ms
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />{formatUptime(server.uptime)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {/* Fill bar */}
                    <div className="hidden sm:block w-20">
                      <div className="h-1 bg-muted overflow-hidden">
                        <div
                          className={`h-full transition-all ${fillPct >= 90 ? "bg-destructive" : fillPct >= 70 ? "bg-warning" : "bg-success"}`}
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                      <span className="font-mono text-[9px] text-muted-foreground">{fillPct}%</span>
                    </div>
                    {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                </button>

                {/* Expanded */}
                {isOpen && (
                  <div className="border-t border-border bg-muted/20 p-4 space-y-4">
                    {/* Metrics */}
                    <div className="grid grid-cols-4 gap-px bg-border border border-border">
                      {[
                        { label: "Players", value: server.players, color: "text-primary" },
                        { label: "Capacity", value: server.max_players, color: "text-foreground" },
                        { label: "FPS", value: server.fps, color: fpsColor },
                        { label: "Ping", value: `${server.ping}ms`, color: pingColor },
                      ].map(m => (
                        <div key={m.label} className="bg-card p-3 text-center">
                          <span className={`font-mono text-lg font-bold ${m.color} block`}>{m.value}</span>
                          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{m.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Player List */}
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">
                        PLAYERS IN SERVER ({server.playerList?.length ?? 0})
                      </span>
                      {server.playerList && server.playerList.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
                          {server.playerList.map((p: ServerPlayer) => (
                            <div key={p.user_id} className="flex items-center gap-2 bg-card border border-border px-2 py-1.5">
                              <img src={p.avatar_url} alt="" className="h-5 w-5 border border-border shrink-0" crossOrigin="anonymous" />
                              <div className="min-w-0">
                                <span className="font-mono text-[10px] text-foreground truncate block">{p.display_name}</span>
                                <span className="font-mono text-[9px] text-muted-foreground truncate block">{p.user_id}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="font-mono text-[10px] text-muted-foreground">Awaiting player data from heartbeat...</span>
                      )}
                    </div>

                    {/* Announce */}
                    <div className="border-t border-border pt-3">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-2">
                        <Megaphone className="h-3 w-3" /> ANNOUNCE
                      </span>
                      <div className="flex gap-2">
                        <Input value={announceMsg} onChange={e => setAnnounceMsg(e.target.value)} placeholder="Message..." className="font-mono text-xs h-7 bg-card" onKeyDown={e => { if (e.key === "Enter" && announceMsg.trim()) handleAnnounce(server.id) }} />
                        <Button size="sm" className="font-mono text-[10px] h-7 gap-1" disabled={!announceMsg.trim() || announcing} onClick={() => handleAnnounce(server.id)}>
                          {announcing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                          SEND
                        </Button>
                      </div>
                    </div>

                    {/* Shutdown */}
                    <div className="flex justify-end border-t border-border pt-3">
                      <Button variant="destructive" size="sm" className="font-mono text-[10px] h-7 gap-1" onClick={() => setShutdownTarget(server)}>
                        <Power className="h-3 w-3" />
                        SHUTDOWN
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Shutdown Dialog */}
      <AlertDialog open={!!shutdownTarget} onOpenChange={open => { if (!open) setShutdownTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-sm">CONFIRM SHUTDOWN</AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-xs">
              Shutdown server <span className="text-foreground">{shutdownTarget?.id.slice(0, 12)}...</span>?
              This disconnects {shutdownTarget?.players} player{shutdownTarget?.players !== 1 ? "s" : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-mono text-xs">CANCEL</AlertDialogCancel>
            <AlertDialogAction onClick={handleShutdown} disabled={shuttingDown} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-mono text-xs">
              {shuttingDown && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              SHUTDOWN
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
