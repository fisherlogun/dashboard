"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Server, Users, RefreshCw, Wifi, MonitorDot } from "lucide-react"
import { toast } from "sonner"

interface ServerData {
  id: string
  players: number
  maxPlayers: number
  fps: number
  ping: number
}

export default function ServersPage() {
  const [servers, setServers] = useState<ServerData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

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

      {/* Server Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg border border-border bg-card" />
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {servers.map((server) => {
            const fillPercent = Math.round((server.players / server.maxPlayers) * 100)
            const fillColor =
              fillPercent >= 90
                ? "bg-destructive"
                : fillPercent >= 70
                  ? "bg-warning"
                  : "bg-success"

            return (
              <Card key={server.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <MonitorDot className="h-3.5 w-3.5 text-primary" />
                      <span className="font-mono text-xs text-muted-foreground truncate max-w-40">
                        {server.id}
                      </span>
                    </CardTitle>
                    <Badge variant="outline" className="text-success text-[10px]">
                      Live
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Player bar */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        Players
                      </span>
                      <span className="font-mono font-medium text-foreground">
                        {server.players}/{server.maxPlayers}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${fillColor}`}
                        style={{ width: `${fillPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <MonitorDot className="h-3 w-3 text-chart-2" />
                      <span className="text-muted-foreground">FPS</span>
                      <span className="ml-auto font-mono font-medium text-foreground">{server.fps}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Wifi className="h-3 w-3 text-chart-4" />
                      <span className="text-muted-foreground">Ping</span>
                      <span className="ml-auto font-mono font-medium text-foreground">{server.ping}ms</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
