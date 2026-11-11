import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: string | number
  detail: string
  icon: LucideIcon
}) {
  return (
    <Card className="relative overflow-hidden border-t-2 border-t-primary/55 bg-card/80 shadow-[0_14px_40px_rgba(0,0,0,.13)]">
      <CardContent className="flex min-h-[132px] items-start justify-between gap-3 p-4 sm:min-h-[148px] sm:p-5">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-3 text-[1.75rem] font-semibold leading-none tabular-nums tracking-[-0.04em] sm:text-[2rem]">{value}</p>
          <p className="mt-3 truncate text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center border border-primary/15 bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="size-4" />
        </div>
      </CardContent>
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-8 -right-8 size-20 rounded-full border border-primary/10" />
    </Card>
  )
}
