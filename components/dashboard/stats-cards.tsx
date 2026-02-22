"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Eye, Server, Heart, ThumbsUp, ThumbsDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsData {
  activePlayers: number
  totalVisits: number
  serverCount: number
  favorites: number
  likes: number
  dislikes: number
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toLocaleString()
}

const statCards = [
  {
    key: "activePlayers" as const,
    title: "Active Players",
    icon: Users,
    colorClass: "text-chart-1",
    bgClass: "bg-chart-1/10",
  },
  {
    key: "totalVisits" as const,
    title: "Total Visits",
    icon: Eye,
    colorClass: "text-chart-2",
    bgClass: "bg-chart-2/10",
  },
  {
    key: "serverCount" as const,
    title: "Servers",
    icon: Server,
    colorClass: "text-chart-3",
    bgClass: "bg-chart-3/10",
  },
  {
    key: "favorites" as const,
    title: "Favorites",
    icon: Heart,
    colorClass: "text-chart-4",
    bgClass: "bg-chart-4/10",
  },
  {
    key: "likes" as const,
    title: "Likes",
    icon: ThumbsUp,
    colorClass: "text-success",
    bgClass: "bg-success/10",
  },
  {
    key: "dislikes" as const,
    title: "Dislikes",
    icon: ThumbsDown,
    colorClass: "text-chart-5",
    bgClass: "bg-chart-5/10",
  },
]

export function StatsCards({
  data,
  loading,
}: {
  data: StatsData | null
  loading: boolean
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {statCards.map((card) => (
        <Card key={card.key} className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", card.bgClass)}>
              <card.icon className={cn("h-4 w-4", card.colorClass)} />
            </div>
          </CardHeader>
          <CardContent>
            {loading || !data ? (
              <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-2xl font-bold tracking-tight text-card-foreground">
                {formatNumber(data[card.key])}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
