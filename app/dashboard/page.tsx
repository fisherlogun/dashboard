"use client"

import { useState, useEffect, useCallback } from "react"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { StatsChart } from "@/components/dashboard/stats-chart"
import { ServerStatus } from "@/components/dashboard/server-status"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface StatsResponse {
  activePlayers: number
  totalVisits: number
  serverCount: number
  favorites: number
  likes: number
  dislikes: number
  gameName: string
  history: { time: string; players: number }[]
  lastUpdated: string
  serverStatus: "online" | "offline" | "unknown"
}

const POLL_INTERVAL = 30000 // 30 seconds

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    try {
      const res = await fetch("/api/stats")
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      } else if (res.status === 400) {
        const data = await res.json()
        if (data.setupRequired) {
          window.location.href = "/setup"
          return
        }
      } else if (res.status === 429) {
        toast.error("Rate limited. Please wait a moment.")
      }
    } catch {
      toast.error("Failed to fetch stats")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(() => fetchStats(), POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchStats])

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <ServerStatus
          status={stats?.serverStatus ?? "unknown"}
          lastUpdated={stats?.lastUpdated ?? null}
          gameName={stats?.gameName ?? null}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchStats(true)}
          disabled={refreshing}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <StatsCards
        data={
          stats
            ? {
                activePlayers: stats.activePlayers,
                totalVisits: stats.totalVisits,
                serverCount: stats.serverCount,
                favorites: stats.favorites,
                likes: stats.likes,
                dislikes: stats.dislikes,
              }
            : null
        }
        loading={loading}
      />

      {/* Player History Chart */}
      <StatsChart data={stats?.history ?? []} loading={loading} />
    </div>
  )
}
