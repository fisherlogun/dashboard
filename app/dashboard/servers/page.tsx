"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Server,
  Users,
  RefreshCw,
  Wifi,
  MonitorDot,
  Power,
  ChevronDown,
  ChevronUp,
  User,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { useSession } from "@/components/session-provider"
import { hasPermission, type Role } from "@/lib/roles"

interface ServerData {
  id: string
  players: number
  maxPlayers: number
  fps: number
  ping: number
  playerTokens: string[]
}

export default function ServersPage() {
  const { user } = useSession()
  const [servers, setServers] = useState<ServerData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedServer, setExpandedServer] = useState<string | null>(null)
  const [shutdownTarget, setShutdownTarget] = useState<ServerData | null>(null)
  const [shuttingDown, setShuttingDown] = useState(false)

  const canManage = user ? hasPermission(user.role as Role, "manage_config") : false

  const fetchServers = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    try {
      const res = await fetch("/api/servers")
      if (res.ok) {
        const data = await res.json()
        setServers(data.servers)
      } else if (res.status === 400) {
        const data = await res.json()
        if (data.setupRequired) {
          window.location.href = "/setup"
        }
      }
    } catch {
      toast.error("Failed to fetch servers")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchServers()
    const interval = setInterval(() => fetchServers(), 30000)
    return () => clearInterval(interval)
  }, [fetchServers])

  const handleShutdown = async () => {
    if (!shutdownTarget) return
    setShuttingDown(true)
    try {
      const res = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverId: shutdownTarget.id, action: "shutdown" }),
      })
      if (res.ok) {
        toast.success(`Shutdown command sent to server ${shutdownTarget.id.slice(0, 8)}...`)
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to shutdown server")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setShuttingDown(false)
      setShutdownTarget(null)
    }
  }

  const totalPlayers = servers.reduce((sum, s) => sum + s.players, 0)
  const totalCapacity = servers.reduce((sum, s) => sum + s.maxPlayers, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
            <Server className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Servers</h1>
            <p className="text-sm text-muted-foreground">
              {servers.length} active {servers.length === 1 ? "server" : "servers"} | {totalPlayers}/{totalCapacity} players
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchServers(true)}
          disabled={refreshing}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Server List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg border border-border bg-card" />
          ))}
        </div>
      ) : servers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Server className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No servers online</p>
            <p className="text-xs text-muted-foreground">Servers will appear here when players join your game.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {servers.map((server) => {
            const isExpanded = expandedServer === server.id
            const fillPercent = Math.round((server.players / server.maxPlayers) * 100)
            const fillColor =
              fillPercent >= 90 ? "bg-destructive" : fillPercent >= 70 ? "bg-warning" : "bg-success"

            return (
              <Card key={server.id} className="overflow-hidden">
                {/* Server Row - clickable */}
                <button
                  onClick={() => setExpandedServer(isExpanded ? null : server.id)}
                  className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-accent/30"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <MonitorDot className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-foreground truncate">
                          {server.id}
                        </span>
                        <Badge variant="outline" className="text-success text-[10px] shrink-0">
                          Live
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {server.players}/{server.maxPlayers} players
                        </span>
                        <span className="flex items-center gap-1">
                          <MonitorDot className="h-3 w-3" />
                          {server.fps} FPS
                        </span>
                        <span className="flex items-center gap-1">
                          <Wifi className="h-3 w-3" />
                          {server.ping}ms
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {/* Player fill bar */}
                    <div className="hidden sm:block w-24">
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${fillColor}`}
                          style={{ width: `${fillPercent}%` }}
                        />
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 p-4 space-y-4">
                    {/* Metrics Row */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="rounded-lg border border-border bg-card p-3 text-center">
                        <p className="text-lg font-bold text-foreground font-mono">{server.players}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Players</p>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-3 text-center">
                        <p className="text-lg font-bold text-foreground font-mono">{server.maxPlayers}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Capacity</p>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-3 text-center">
                        <p className="text-lg font-bold text-foreground font-mono">{server.fps}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">FPS</p>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-3 text-center">
                        <p className="text-lg font-bold text-foreground font-mono">{server.ping}ms</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ping</p>
                      </div>
                    </div>

                    {/* Player Tokens */}
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Players in Server ({server.players})
                      </h4>
                      {server.playerTokens.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                          {server.playerTokens.map((token, idx) => (
                            <div
                              key={token}
                              className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5"
                            >
                              <User className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="text-xs font-mono text-foreground truncate">
                                Player {idx + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Player tokens are anonymous identifiers. {server.players} player{server.players !== 1 ? "s" : ""} currently connected.
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    {canManage && (
                      <div className="flex items-center justify-between border-t border-border pt-3">
                        <p className="text-xs text-muted-foreground">
                          Server actions require owner or admin permissions.
                        </p>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShutdownTarget(server)
                          }}
                        >
                          <Power className="h-3.5 w-3.5" />
                          Shutdown
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Shutdown Confirmation */}
      <AlertDialog open={!!shutdownTarget} onOpenChange={(open) => !open && setShutdownTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Shutdown Server</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to shutdown server{" "}
              <span className="font-mono text-foreground">{shutdownTarget?.id.slice(0, 12)}...</span>?
              This will disconnect {shutdownTarget?.players} player{shutdownTarget?.players !== 1 ? "s" : ""}. This action will be logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleShutdown}
              disabled={shuttingDown}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {shuttingDown && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Shutdown
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
