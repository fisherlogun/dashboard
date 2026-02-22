"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
} from "lucide-react"
import { toast } from "sonner"
import { useSession } from "@/components/session-provider"
import { hasPermission, type Role } from "@/lib/roles"

interface Player {
  id: number
  name: string
  displayName: string
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
]

export default function PlayersPage() {
  const { user } = useSession()
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<Player[]>([])
  const [searched, setSearched] = useState(false)

  const [actionPlayer, setActionPlayer] = useState<Player | null>(null)
  const [actionType, setActionType] = useState<"kick" | "ban" | "warn">("kick")
  const [reason, setReason] = useState("")
  const [banDuration, setBanDuration] = useState("1d")
  const [executing, setExecuting] = useState(false)

  const canKick = user ? hasPermission(user.role as Role, "execute_kick") : false
  const canBan = user ? hasPermission(user.role as Role, "execute_ban") : false
  const canWarn = user ? hasPermission(user.role as Role, "execute_warn") : false

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
      const payload =
        actionType === "kick"
          ? { type: "kick", userId: String(actionPlayer.id), reason }
          : actionType === "ban"
            ? { type: "ban", userId: String(actionPlayer.id), reason, duration: banDuration }
            : { type: "warn", userId: String(actionPlayer.id), reason }

      const res = await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (res.ok) {
        toast.success(`${actionType} command sent for ${actionPlayer.displayName}`)
        setActionPlayer(null)
        setReason("")
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
      {/* Search */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-card-foreground">
            <Users className="h-4 w-4 text-primary" />
            Player Lookup
          </CardTitle>
          <CardDescription>
            Search for Roblox players by username or user ID. Execute commands on players even when they are offline.
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

                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={`Reason for ${actionType}...`}
                  maxLength={200}
                />

                {actionType === "ban" && (
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
                )}

                <Button
                  className="w-full gap-2"
                  onClick={executeAction}
                  disabled={executing || (actionType === "warn" && !reason)}
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
