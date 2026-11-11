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
    <Card className="h-full border-border/70 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent joins</CardTitle>
        <CardDescription>Join events received from the live server script</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border px-4 text-center">
            <p className="text-sm font-medium">No join activity yet</p>
            <p className="mt-1 max-w-56 text-xs leading-relaxed text-muted-foreground">Install the server script to stream joins from your live Roblox servers.</p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
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
                    <img src={avatarUrl} alt="" loading="lazy" className="size-8 rounded-full bg-muted object-cover" />
                  ) : (
                    <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-primary/10 font-mono text-xs text-primary">
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
