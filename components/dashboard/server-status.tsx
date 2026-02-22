"use client"

import { Badge } from "@/components/ui/badge"
import { Circle } from "lucide-react"
import { cn } from "@/lib/utils"

export function ServerStatus({
  status,
  lastUpdated,
  gameName,
}: {
  status: "online" | "offline" | "unknown"
  lastUpdated: string | null
  gameName: string | null
}) {
  const statusConfig = {
    online: { label: "Online", color: "text-success", bg: "bg-success" },
    offline: { label: "Offline", color: "text-destructive-foreground", bg: "bg-destructive" },
    unknown: { label: "Checking...", color: "text-muted-foreground", bg: "bg-muted-foreground" },
  }

  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-3">
      {gameName && (
        <h2 className="text-lg font-semibold text-foreground">{gameName}</h2>
      )}
      <Badge
        variant="outline"
        className={cn("gap-1.5 text-xs", config.color)}
      >
        <Circle className={cn("h-2 w-2 fill-current", config.color)} />
        {config.label}
      </Badge>
      {lastUpdated && (
        <span className="text-xs text-muted-foreground">
          Updated {new Date(lastUpdated).toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}
