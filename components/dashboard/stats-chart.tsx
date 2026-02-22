"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"

interface HistoryPoint {
  time: string
  players: number
}

export function StatsChart({
  data,
  loading,
}: {
  data: HistoryPoint[]
  loading: boolean
}) {
  const formatted = data.map((point) => ({
    ...point,
    label: new Date(point.time).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }))

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-card-foreground">Active Players Over Time</CardTitle>
        <CardDescription>
          Live player count history (updates every polling interval)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading || formatted.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            {loading ? "Loading chart data..." : "No data yet. Stats will appear after the first poll."}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={formatted}>
              <defs>
                <linearGradient id="playerGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.75 0.15 190)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.75 0.15 190)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="label"
                className="text-xs fill-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                className="text-xs fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.16 0.015 240)",
                  border: "1px solid oklch(0.24 0.015 240)",
                  borderRadius: "8px",
                  color: "oklch(0.90 0.01 240)",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "oklch(0.55 0.015 240)" }}
              />
              <Area
                type="monotone"
                dataKey="players"
                stroke="oklch(0.75 0.15 190)"
                strokeWidth={2}
                fill="url(#playerGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
