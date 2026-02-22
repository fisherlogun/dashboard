"use client"

import { useState, useCallback, useEffect } from "react"
import { useSession } from "@/components/session-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShieldBan, Plus, Search, UserX, Clock, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { hasPermission, type Role } from "@/lib/roles"
import { DateTimePicker } from "@/components/date-time-picker"

interface BanEntry {
  _id: string
  robloxUserId: string
  robloxDisplayName: string
  bannedBy: string
  bannedByName: string
  reason: string
  privateReason?: string
  duration: string
  expiresAt: string | null
  createdAt: string
  active: boolean
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

export default function BansPage() {
  const { user } = useSession()
  const [bans, setBans] = useState<BanEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [showPrivateReasons, setShowPrivateReasons] = useState(false)
  const [form, setForm] = useState({
    userId: "",
    displayName: "",
    reason: "",
    privateReason: "",
    duration: "1d",
  })
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)

  const canBan = user ? hasPermission(user.role as Role, "execute_ban") : false
  const canManageBans = user ? hasPermission(user.role as Role, "manage_bans") : false

  const fetchBans = useCallback(async () => {
    try {
      const res = await fetch("/api/bans")
      if (res.ok) {
        const data = await res.json()
        setBans(data.bans)
      }
    } catch {
      toast.error("Failed to fetch bans")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBans()
  }, [fetchBans])

  const handleBan = async () => {
    if (!form.userId.trim() || !form.reason.trim()) {
      toast.error("User ID and reason are required")
      return
    }
    if (form.duration === "custom" && !customDate) {
      toast.error("Please select a custom date and time")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/bans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          robloxUserId: form.userId.trim(),
          robloxDisplayName: form.displayName.trim() || "Unknown",
          reason: form.reason.trim(),
          privateReason: form.privateReason.trim(),
          duration: form.duration,
          ...(form.duration === "custom" && customDate
            ? { expiresAt: customDate.toISOString() }
            : {}),
        }),
      })
      if (res.ok) {
        toast.success("User banned via Roblox Ban API")
        setForm({ userId: "", displayName: "", reason: "", privateReason: "", duration: "1d" })
        setCustomDate(undefined)
        setShowAdd(false)
        fetchBans()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to ban user")
      }
    } catch {
      toast.error("Failed to ban user")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnban = async (userId: string, name: string) => {
    try {
      const res = await fetch(`/api/bans?userId=${userId}`, { method: "DELETE" })
      if (res.ok) {
        toast.success(`${name} has been unbanned via Roblox API`)
        fetchBans()
      }
    } catch {
      toast.error("Failed to unban user")
    }
  }

  const filtered = bans.filter(
    (b) =>
      b.robloxDisplayName.toLowerCase().includes(search.toLowerCase()) ||
      b.robloxUserId.includes(search) ||
      b.reason.toLowerCase().includes(search.toLowerCase())
  )

  const activeBans = bans.filter((b) => b.active)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/15">
            <ShieldBan className="h-5 w-5 text-destructive-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Bans</h1>
            <p className="text-sm text-muted-foreground">
              {activeBans.length} active {activeBans.length === 1 ? "ban" : "bans"} | Uses Roblox Ban API
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowPrivateReasons(!showPrivateReasons)}
          >
            {showPrivateReasons ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPrivateReasons ? "Hide Private" : "Show Private"}
          </Button>
          {canBan && (
            <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(!showAdd)}>
              <Plus className="h-3.5 w-3.5" />
              Ban User
            </Button>
          )}
        </div>
      </div>

      {/* Add Ban Form */}
      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ban a Player</CardTitle>
            <CardDescription>
              This will use Roblox's Ban API to restrict the player from joining your game.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Roblox User ID</Label>
                <Input
                  placeholder="e.g. 123456789"
                  value={form.userId}
                  onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Display Name (optional)</Label>
                <Input
                  placeholder="Player display name"
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reason (shown to player)</Label>
              <Input
                placeholder="Reason for ban (visible to the player)"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Private Reason (internal only, not visible to player)</Label>
              <Input
                placeholder="Private internal reason..."
                value={form.privateReason}
                onChange={(e) => setForm((f) => ({ ...f, privateReason: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="space-y-1.5 sm:w-48">
                <Label className="text-xs">Duration</Label>
                <Select
                  value={form.duration}
                  onValueChange={(v) => setForm((f) => ({ ...f, duration: v }))}
                >
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
              {form.duration === "custom" && (
                <div className="flex-1">
                  <DateTimePicker
                    date={customDate}
                    onDateChange={setCustomDate}
                    label="Ban Until"
                    placeholder="Select ban end date and time"
                    minDate={new Date()}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleBan} disabled={submitting} className="gap-1.5">
                <ShieldBan className="h-3.5 w-3.5" />
                {submitting ? "Banning..." : "Confirm Ban"}
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search bans..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Bans List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-card" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <UserX className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {search ? "No bans match your search" : "No bans recorded"}
            </p>
            <p className="text-xs text-muted-foreground">
              {search ? "Try a different search term." : "Banned players will appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((ban) => {
            const isExpired = ban.expiresAt && new Date(ban.expiresAt) < new Date()

            return (
              <div
                key={ban._id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-xs font-bold text-destructive-foreground">
                    {ban.robloxDisplayName[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-card-foreground">
                        {ban.robloxDisplayName}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {ban.robloxUserId}
                      </span>
                      {ban.active && !isExpired ? (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {isExpired ? "Expired" : "Inactive"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{ban.reason}</p>
                    {showPrivateReasons && ban.privateReason && (
                      <p className="text-xs text-muted-foreground/70 italic">
                        Private: {ban.privateReason}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {ban.duration === "permanent"
                          ? "Permanent"
                          : ban.duration === "custom" && ban.expiresAt
                            ? `Until ${new Date(ban.expiresAt).toLocaleString()}`
                            : ban.duration}
                      </span>
                      <span>by {ban.bannedByName}</span>
                      <span>{new Date(ban.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                {canManageBans && ban.active && !isExpired && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={() => handleUnban(ban.robloxUserId, ban.robloxDisplayName)}
                  >
                    Unban
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
