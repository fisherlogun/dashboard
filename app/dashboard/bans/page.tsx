"use client"

import { useState, useCallback, useEffect } from "react"
import { useSession } from "@/components/session-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShieldBan, Plus, Search, UserX, Clock } from "lucide-react"
import { toast } from "sonner"
import { hasPermission, type Role } from "@/lib/roles"

interface BanEntry {
  _id: string
  robloxUserId: string
  robloxDisplayName: string
  bannedBy: string
  bannedByName: string
  reason: string
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
]

export default function BansPage() {
  const { user } = useSession()
  const [bans, setBans] = useState<BanEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ userId: "", displayName: "", reason: "", duration: "1d" })
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
    setSubmitting(true)
    try {
      const res = await fetch("/api/bans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          robloxUserId: form.userId.trim(),
          robloxDisplayName: form.displayName.trim() || "Unknown",
          reason: form.reason.trim(),
          duration: form.duration,
        }),
      })
      if (res.ok) {
        toast.success("User banned successfully")
        setForm({ userId: "", displayName: "", reason: "", duration: "1d" })
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
        toast.success(`${name} has been unbanned`)
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
              {activeBans.length} active {activeBans.length === 1 ? "ban" : "bans"}
            </p>
          </div>
        </div>
        {canBan && (
          <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-3.5 w-3.5" />
            Ban User
          </Button>
        )}
      </div>

      {/* Add Ban Form */}
      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ban a Player</CardTitle>
            <CardDescription>
              Enter the player details and ban configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Roblox User ID"
                value={form.userId}
                onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                className="font-mono"
              />
              <Input
                placeholder="Display Name (optional)"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              />
            </div>
            <Input
              placeholder="Reason for ban"
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select
                value={form.duration}
                onValueChange={(v) => setForm((f) => ({ ...f, duration: v }))}
              >
                <SelectTrigger className="sm:w-48">
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
              <div className="flex gap-2">
                <Button onClick={handleBan} disabled={submitting} className="gap-1.5">
                  <ShieldBan className="h-3.5 w-3.5" />
                  {submitting ? "Banning..." : "Confirm Ban"}
                </Button>
                <Button variant="outline" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
              </div>
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
            const isExpired =
              ban.expiresAt && new Date(ban.expiresAt) < new Date()

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
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {ban.duration === "permanent" ? "Permanent" : ban.duration}
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
