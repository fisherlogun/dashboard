"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users,
  Search,
  Loader2,
  UserX,
  ShieldBan,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Gamepad2,
} from "lucide-react"
import { toast } from "sonner"
import { useSession } from "@/components/session-provider"
import { hasPermission, type Role } from "@/lib/roles"
import { DateTimePicker } from "@/components/date-time-picker"

interface Player {
  id: number
  name: string
  displayName: string
}

interface InGamePlayer {
  token: string
  serverId: string
  index: number
}

const DURATION_OPTIONS = [
  { value: "1h", label: "1 Hour" },
  { value: "6h", label: "6 Hours" },
  { value: "12h", label: "12 Hours" },
  { value: "1d", label: "1 Day" },
  { value: "3d", label: "3 Days" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "permanent", label: "Permanent" },
  { value: "custom", label: "Custom Date/Time" },
]

export default function PlayersPage() {
  const { user } = useSession()
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<Player[]>([])
  const [searched, setSearched] = useState(false)

  // In-game players
  const [inGamePlayers, setInGamePlayers] = useState<InGamePlayer[]>([])
  const [loadingInGame, setLoadingInGame] = useState(true)
  const [totalOnline, setTotalOnline] = useState(0)

  const [actionPlayer, setActionPlayer] = useState<Player | null>(null)
  const [actionType, setActionType] = useState<"kick" | "ban" | "warn">("kick")
  const [reason, setReason] = useState("")
  const [privateReason, setPrivateReason] = useState("")
  const [banDuration, setBanDuration] = useState("1d")
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined)
  const [executing, setExecuting] = useState(false)

  const canKick = user ? hasPermission(user.role as Role, "execute_kick") : false
  const canBan = user ? hasPermission(user.role as Role, "execute_ban") : false
  const canWarn = user ? hasPermission(user.role as Role, "execute_warn") : false

  // Fetch in-game players from servers API
  const fetchInGamePlayers = useCallback(async () => {
    try {
      const res = await fetch("/api/servers")
      if (res.ok) {
        const data = await res.json()
        const players: InGamePlayer[] = []
        let total = 0
        for (const server of data.servers ?? []) {
          total += server.players
          for (let i = 0; i < (server.playerTokens?.length ?? 0); i++) {
            players.push({
              token: server.playerTokens[i],
              serverId: server.id,
              index: i + 1,
            })
          }
        }
        setInGamePlayers(players)
        setTotalOnline(total)
      }
    } catch {
      // silent
    } finally {
      setLoadingInGame(false)
    }
  }, [])

  useEffect(() => {
    fetchInGamePlayers()
    const interval = setInterval(fetchInGamePlayers, 30000)
    return () => clearInterval(interval)
  }, [fetchInGamePlayers])

  async function searchPlayers() {
    if (!query.trim()) return
    setSearching(true)
    setSearched(false)
    try {
      const res = await fetch(`/api/players?keyword=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      setResults(data.players ?? [])
      setSearched(true)
    } catch {
      toast.error("Search failed")
    } finally {
      setSearching(false)
    }
  }

  async function executeAction() {
    if (!actionPlayer) return
    setExecuting(true)
    try {
      let payload: Record<string, unknown>

      if (actionType === "ban") {
        payload = {
          type: "ban",
          userId: String(actionPlayer.id),
          reason,
          privateReason,
          duration: banDuration,
          ...(banDuration === "custom" && customDate ? { expiresAt: customDate.toISOString() } : {}),
        }
        // Also call the bans API to use Roblox Ban API
        const banRes = await fetch("/api/bans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            robloxUserId: String(actionPlayer.id),
            robloxDisplayName: actionPlayer.displayName,
            reason,
            privateReason,
            duration: banDuration,
            ...(banDuration === "custom" && customDate ? { expiresAt: customDate.toISOString() } : {}),
          }),
        })
        const banData = await banRes.json()
        if (banRes.ok) {
          toast.success(`Ban applied to ${actionPlayer.displayName} via Roblox Ban API`)
        } else {
          toast.error(banData.error || "Ban failed")
        }
        // Also kick via messaging service
        payload = { type: "kick", userId: String(actionPlayer.id), reason: `Banned: ${reason}` }
      } else {
        payload = actionType === "kick"
          ? { type: "kick", userId: String(actionPlayer.id), reason }
          : { type: "warn", userId: String(actionPlayer.id), reason }
      }

      const res = await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (res.ok) {
        if (actionType !== "ban") {
          toast.success(`${actionType} command sent for ${actionPlayer.displayName}`)
        }
        setActionPlayer(null)
        setReason("")
        setPrivateReason("")
        setCustomDate(undefined)
      } else {
        toast.error(data.error || "Command failed")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* In-Game Players */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-card-foreground">
              <Gamepad2 className="h-4 w-4 text-primary" />
              Currently In-Game
              <Badge variant="secondary" className="text-xs font-mono">
                {totalOnline}
              </Badge>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLoadingInGame(true)
                fetchInGamePlayers()
              }}
              className="h-7 w-7 p-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingInGame ? "animate-spin" : ""}`} />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
          <CardDescription>
            All players currently connected to your game servers. Player tokens are anonymous identifiers from Roblox.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInGame ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : inGamePlayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No players currently in-game.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {inGamePlayers.map((player) => (
                <div
                  key={player.token}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-2"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {player.index}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">
                      Player {player.index}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      {player.serverId.slice(0, 8)}...
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-card-foreground">
            <Search className="h-4 w-4 text-primary" />
            Player Lookup
          </CardTitle>
          <CardDescription>
            Search for Roblox players by username or user ID to execute commands.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username or user ID..."
              className="font-mono"
              onKeyDown={(e) => e.key === "Enter" && searchPlayers()}
            />
            <Button
              onClick={searchPlayers}
              disabled={!query.trim() || searching}
              className="gap-1.5 shrink-0"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Results */}
        <Card className="border-border/50 lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-card-foreground">Results</CardTitle>
          </CardHeader>
          <CardContent>
            {!searched ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Search for a player to see results.
              </p>
            ) : results.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No players found matching your search.
              </p>
            ) : (
              <div className="space-y-2">
                {results.map((player) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                      actionPlayer?.id === player.id
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/50 hover:bg-accent/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                        {player.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {player.displayName}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-mono">
                            @{player.name}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                            {player.id}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant={actionPlayer?.id === player.id ? "default" : "ghost"}
                        size="sm"
                        onClick={() =>
                          setActionPlayer(
                            actionPlayer?.id === player.id ? null : player
                          )
                        }
                        className="h-7 text-xs"
                      >
                        Actions
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-7 w-7 p-0"
                      >
                        <a
                          href={`https://www.roblox.com/users/${player.id}/profile`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="sr-only">View Roblox Profile</span>
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Panel */}
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-card-foreground">Quick Action</CardTitle>
            <CardDescription>
              {actionPlayer
                ? `Execute command on ${actionPlayer.displayName}`
                : "Select a player to take action."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!actionPlayer ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Select a player from the results.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { type: "kick" as const, icon: UserX, label: "Kick", perm: canKick },
                    { type: "ban" as const, icon: ShieldBan, label: "Ban", perm: canBan },
                    { type: "warn" as const, icon: AlertTriangle, label: "Warn", perm: canWarn },
                  ].map((act) => (
                    <Button
                      key={act.type}
                      variant={actionType === act.type ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActionType(act.type)}
                      disabled={!act.perm}
                      className="gap-1.5 text-xs"
                    >
                      <act.icon className="h-3 w-3" />
                      {act.label}
                    </Button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground">Reason (shown to player)</Label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={`Reason for ${actionType}...`}
                    maxLength={200}
                  />
                </div>

                {actionType === "ban" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground">Private Reason (internal only)</Label>
                      <Input
                        value={privateReason}
                        onChange={(e) => setPrivateReason(e.target.value)}
                        placeholder="Private reason (not visible to player)..."
                        maxLength={200}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground">Ban Duration</Label>
                      <Select value={banDuration} onValueChange={setBanDuration}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DURATION_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {banDuration === "custom" && (
                      <DateTimePicker
                        date={customDate}
                        onDateChange={setCustomDate}
                        label="Ban Until"
                        placeholder="Select ban end date and time"
                        minDate={new Date()}
                      />
                    )}
                  </>
                )}

                <Button
                  className="w-full gap-2"
                  onClick={executeAction}
                  disabled={
                    executing ||
                    (actionType === "warn" && !reason) ||
                    (actionType === "ban" && banDuration === "custom" && !customDate)
                  }
                >
                  {executing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Execute {actionType}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
