import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"

export interface HistoryPoint {
  recorded_at: string
  player_count: number
}

export function PlayerHistoryChart({ history }: { history: HistoryPoint[] }) {
  const chartData = history.map((point) => ({
    time: point.recorded_at,
    players: point.player_count,
  }))

  return (
    <ChartContainer
      config={{ players: { label: "Players", color: "var(--chart-1)" } }}
      className="aspect-auto h-[260px] w-full"
    >
      <AreaChart data={chartData} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="playerFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-players)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--color-players)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/70" />
        <XAxis
          dataKey="time"
          tickLine={false}
          axisLine={false}
          minTickGap={28}
          tickMargin={10}
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          tickFormatter={(value: string) => new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        />
        <YAxis
          allowDecimals={false}
          width={28}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
        />
        <Tooltip
          cursor={false}
          content={<ChartTooltipContent indicator="line" labelFormatter={(value) => new Date(String(value)).toLocaleString()} />}
        />
        <Area
          dataKey="players"
          type="monotone"
          stroke="var(--color-players)"
          strokeWidth={2}
          fill="url(#playerFill)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  )
}
