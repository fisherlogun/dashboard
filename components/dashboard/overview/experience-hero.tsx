import { ArrowUpRight, LockKeyhole, RefreshCw, Server, ShieldCheck, Waves } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface ExperienceHeroProps {
  gameName: string
  projectName: string
  universeId: string
  placeId: string
  thumbnail: string | null
  players: number
  servers: number
  totalCapacity: number
  publicPlaying: number
  heartbeatAgeSeconds: number | null
  hasError: boolean
  isRefreshing: boolean
  onRefresh: () => void
  onShutdown: () => void
}

export function ExperienceHero({
  gameName,
  projectName,
  universeId,
  placeId,
  thumbnail,
  players,
  servers,
  totalCapacity,
  publicPlaying,
  heartbeatAgeSeconds,
  hasError,
  isRefreshing,
  onRefresh,
  onShutdown,
}: ExperienceHeroProps) {
  const occupancy = totalCapacity > 0 ? Math.min(100, Math.round((players / totalCapacity) * 100)) : 0
  const relayStatus = hasError
    ? "Telemetry issue"
    : servers > 0
      ? "Live relay"
      : heartbeatAgeSeconds === null
        ? "Awaiting signal"
        : "No live servers"

  return (
    <section className="group relative isolate min-h-[370px] overflow-hidden border border-border/80 bg-[#09171a] sm:min-h-[390px]">
      <img
        src={thumbnail ?? "/scuba-console-art.png"}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover opacity-55 transition-transform duration-700 group-hover:scale-[1.025]"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#071114]/95 via-[#071114]/75 to-[#071114]/35" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#071114]/95 via-transparent to-[#071114]/25" />
      <div aria-hidden="true" className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(174,220,211,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(174,220,211,.12)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(90deg,black,transparent_78%)]" />

      <div className="relative flex min-h-[370px] flex-col justify-between p-5 sm:min-h-[390px] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5 border-primary/40 bg-black/25 text-primary backdrop-blur-sm">
              <ShieldCheck aria-hidden="true" className="size-3" /> Owner console
            </Badge>
            <Badge variant="outline" className="border-white/20 bg-black/20 font-mono text-[10px] text-white/75 backdrop-blur-sm">
              UNIVERSE {universeId}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} className="border-white/20 bg-black/25 text-white hover:bg-white/10 hover:text-white">
              <RefreshCw data-icon="inline-start" className={isRefreshing ? "animate-spin" : ""} />
              Refresh
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={onShutdown} disabled={!servers}>
              <Server data-icon="inline-start" /> Shut down
            </Button>
          </div>
        </div>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
          <div className="max-w-2xl">
            <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#a9c7c1]">
              <Waves aria-hidden="true" className="size-3.5 text-primary" /> Scuba Simulator <span className="text-white/35">/</span> {projectName}
            </p>
            <h1 className="text-3xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-4xl lg:text-[3.25rem]">{gameName}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/70 sm:text-base">Your live-world control deck for players, server health, scheduled events, and owner actions.</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/65">
              <span className="inline-flex items-center gap-2 font-mono uppercase tracking-[0.12em]">
                <span className={`size-2 rounded-full ${hasError ? "bg-destructive" : servers > 0 ? "animate-pulse bg-[#7fe0b6] shadow-[0_0_12px_rgba(127,224,182,.7)]" : "bg-primary"}`} />
                {relayStatus}
              </span>
              <a href="https://www.roblox.com/games/139373122825390/Scuba-Simulator" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary transition-colors hover:text-white">
                Open experience <ArrowUpRight aria-hidden="true" className="size-3" />
              </a>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-white/45"><LockKeyhole aria-hidden="true" className="size-3" /> Place {placeId}</span>
            </div>
          </div>

          <div className="border border-white/15 bg-[#081416]/65 p-4 backdrop-blur-md sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">Live world</p>
                <p className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-white tabular-nums">{players.toLocaleString()}</p>
                <p className="mt-1 text-xs text-white/55">players in your relay</p>
              </div>
              <div className="flex size-10 items-center justify-center border border-[#7fe0b6]/25 bg-[#7fe0b6]/10 text-[#7fe0b6]">
                <Waves aria-hidden="true" className="size-4" />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-white/55">
              <span>Server capacity</span><span>{occupancy}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden bg-white/10">
              <div className="h-full bg-gradient-to-r from-[#58b7aa] to-primary transition-[width] duration-500" style={{ width: `${occupancy}%` }} />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
              <span className="text-white/55">{servers} reporting server{servers === 1 ? "" : "s"}</span>
              <span className="font-mono text-white/75">{publicPlaying.toLocaleString()} public</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
