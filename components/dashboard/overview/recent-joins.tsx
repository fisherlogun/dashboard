import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export interface JoinEvent {
  id?: string | number
  user_id?: string
  username?: string
  user_name?: string
  action?: string
  details?: string | null
  created_at?: string
}

function eventDisplayName(event: JoinEvent) {
  if (event.user_name || event.username) return event.user_name || event.username || "Unknown player"
  try {
    const details = JSON.parse(event.details || "") as { displayName?: string; username?: string }
    return details.displayName || details.username || "Unknown player"
  } catch {
    return "Unknown player"
  }
}

export function RecentJoins({ events }: { events: JoinEvent[] }) {
  return (
    <Card className="h-full overflow-hidden border-border/70 bg-card/80 shadow-[0_14px_40px_rgba(0,0,0,.13)]">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Recent arrivals</CardTitle>
            <CardDescription className="mt-1">Latest player connections to the live world</CardDescription>
          </div>
          <span className="inline-flex items-center gap-1.5 border border-border/80 bg-background/50 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" /> Live feed
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {events.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border px-4 text-center">
            <p className="text-sm font-medium">No join activity yet</p>
            <p className="mt-1 max-w-56 text-xs leading-relaxed text-muted-foreground">Install the server script to stream joins from your live Roblox servers.</p>
          </div>
        ) : (
          <ul className="flex max-h-[352px] flex-col divide-y divide-border/50 overflow-y-auto pr-1">
            {events.slice(0, 8).map((event, index) => {
              const displayName = eventDisplayName(event)
              let avatarUrl: string | null = null
              try {
                avatarUrl = (JSON.parse(event.details || "") as { avatarUrl?: string }).avatarUrl ?? null
              } catch {
                avatarUrl = null
              }
              return (
                <li key={event.id ?? `${event.user_id ?? displayName}-${event.created_at ?? index}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" loading="lazy" className="size-9 border border-border/70 bg-muted object-cover" />
                  ) : (
                    <span aria-hidden="true" className="flex size-9 items-center justify-center border border-primary/20 bg-primary/10 font-mono text-xs text-primary">
                      {displayName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{displayName}</p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground">{event.user_id ? `USER ${event.user_id}` : "PLAYER JOINED"}</p>
                  </div>
                  <time className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground" dateTime={event.created_at}>
                    {event.created_at ? new Date(event.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </time>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
