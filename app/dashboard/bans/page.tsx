"use client"

import { useState, useCallback } from "react"
import { useSession } from "@/components/session-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ShieldBan, Search, Loader2, Clock, Ban, ShieldOff, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { DateTimePicker } from "@/components/date-time-picker"

interface BanRecord {
  id: string
  roblox_user_id: string
  reason: string
  private_reason: string
  duration: string
  expires_at: string | null
  created_at: string
  active: boolean
  banned_by_name: string
}

export default function BansPage() {
  const { activeProject } = useSession()
  const [bans, setBans] = useState<BanRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState("")
  const [expandedBanId, setExpandedBanId] = useState<string | null>(null)
  const [userId, setUserId] = useState("")
  const [reason, setReason] = useState("")
  const [privateReason, setPrivateReason] = useState("")
  const [duration, setDuration] = useState("1d")
  const [customDate, setCustomDate] = useState<Date | undefined>()

  const fetchBans = useCallback(async () => {
    if (!activeProject) return
    try {
      const res = await fetch(`/api/bans?projectId=${activeProject.id}`)
      if (res.ok) { const d = await res.json(); setBans(d.bans ?? []) }
    } catch { /* */ } finally { setLoading(false) }
  }, [activeProject])

  const handleBan = async () => {
    if (!activeProject || !userId.trim() || !reason.trim()) { toast.error("User ID and reason required"); return }
    setSubmitting(true)
    try {
      let durationSeconds: number | null = null
      let expiresAt: string | null = null
      if (duration === "custom" && customDate) {
        durationSeconds = Math.max(0, Math.floor((customDate.getTime() - Date.now()) / 1000))
        expiresAt = customDate.toISOString()
      } else if (duration !== "permanent") {
        const map: Record<string, number> = { "1h": 3600, "6h": 21600, "12h": 43200, "1d": 86400, "3d": 259200, "7d": 604800, "30d": 2592000 }
        durationSeconds = map[duration] ?? null
      }
      const res = await fetch("/api/bans", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProject.id, robloxUserId: userId.trim(), reason: reason.trim(), privateReason: privateReason.trim(), duration, durationSeconds, expiresAt }),
      })
      if (res.ok) { toast.success("Ban issued"); setUserId(""); setReason(""); setPrivateReason(""); setDuration("1d"); setCustomDate(undefined); fetchBans() }
      else { const d = await res.json(); toast.error(d.error || "Ban failed") }
    } catch { toast.error("Network error") } finally { setSubmitting(false) }
  }

  const handleUnban = async (banId: string) => {
    if (!activeProject) return
    try {
      const res = await fetch("/api/bans", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: activeProject.id, banId }) })
      if (res.ok) { toast.success("Unbanned"); fetchBans() }
    } catch { toast.error("Failed") }
  }

  const formatDuration = (duration: string, expiresAt: string | null) => {
    if (duration === "permanent") return "PERMANENT"
    if (duration === "custom" && expiresAt) {
      const expiry = new Date(expiresAt)
      return expiry.toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
    }
    const map: Record<string, string> = { "1h": "1H", "6h": "6H", "12h": "12H", "1d": "1D", "3d": "3D", "7d": "7D", "30d": "30D" }
    return map[duration] || duration.toUpperCase()
  }

  const fetchBans2 = useCallback(async () => {
    if (!activeProject) return
    try {
      const res = await fetch(`/api/bans?projectId=${activeProject.id}`)
      if (res.ok) { const d = await res.json(); setBans(d.bans ?? []); setLoading(false) }
    } catch { setLoading(false) }
  }, [activeProject])

  useState(() => { fetchBans2() }, [fetchBans2])

  const filtered = bans.filter((b) => b.roblox_user_id.includes(search) || b.reason.toLowerCase().includes(search.toLowerCase()))
  const active = filtered.filter((b) => b.active)
  const inactive = filtered.filter((b) => !b.active)

  if (!activeProject) return <div className="flex items-center justify-center h-64 text-muted-foreground font-mono text-xs">NO_PROJECT_SELECTED</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldBan className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-mono font-bold text-foreground uppercase tracking-wider">Ban Management</h1>
        </div>
        <Badge variant="outline" className="font-mono text-[10px]">{active.length} ACTIVE</Badge>
      </div>

      <div className="border border-border bg-card p-4 space-y-3">
        <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Ban className="h-3 w-3" /> Issue Ban</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] font-mono text-muted-foreground uppercase">User ID</Label>
            <Input placeholder="123456789" value={userId} onChange={(e) => setUserId(e.target.value)} className="font-mono text-xs h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-mono text-muted-foreground uppercase">Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="font-mono text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["1h","6h","12h","1d","3d","7d","30d","permanent","custom"].map((d) => (
                  <SelectItem key={d} value={d} className="font-mono text-xs">{d.toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {duration === "custom" && (
          <div className="space-y-1">
            <Label className="text-[10px] font-mono text-muted-foreground uppercase">Custom Expiry</Label>
            <DateTimePicker date={customDate} onDateChange={setCustomDate} />
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-[10px] font-mono text-muted-foreground uppercase">Display Reason (player sees this)</Label>
          <Textarea placeholder="Reason shown to the player..." value={reason} onChange={(e) => setReason(e.target.value)} className="font-mono text-xs min-h-[60px] resize-none" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-mono text-muted-foreground uppercase">Private Reason (internal)</Label>
          <Input placeholder="Internal notes..." value={privateReason} onChange={(e) => setPrivateReason(e.target.value)} className="font-mono text-xs h-8" />
        </div>
        <Button className="gap-1.5 font-mono text-xs uppercase tracking-wider h-8" onClick={handleBan} disabled={submitting}>
          {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldBan className="h-3 w-3" />} Execute Ban
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="Search by user ID or reason..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 font-mono text-xs h-8" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-1">
          {active.length === 0 && <p className="text-xs font-mono text-muted-foreground text-center py-8">NO_ACTIVE_BANS</p>}
          {active.map((ban) => (
            <div key={ban.id}>
              <button
                onClick={() => setExpandedBanId(expandedBanId === ban.id ? null : ban.id)}
                className="w-full border border-border bg-card p-3 flex items-center justify-between gap-3 hover:bg-card/80 transition-colors"
              >
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-foreground">{ban.roblox_user_id}</span>
                    <Badge variant="destructive" className="text-[10px] font-mono h-4">{formatDuration(ban.duration, ban.expires_at)}</Badge>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">{ban.reason}</p>
                </div>
                {expandedBanId === ban.id ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>
              {expandedBanId === ban.id && (
                <div className="border border-t-0 border-border bg-card/50 p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <span className="text-muted-foreground">Issued:</span>
                    <span className="text-foreground">{new Date(ban.created_at).toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</span>
                    <span className="text-muted-foreground">Issued By:</span>
                    <span className="text-foreground">{ban.banned_by_name}</span>
                    {ban.expires_at && (
                      <>
                        <span className="text-muted-foreground">Expires:</span>
                        <span className="text-foreground">{new Date(ban.expires_at).toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</span>
                      </>
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-muted-foreground">Display Reason:</span>
                    <p className="text-[10px] font-mono text-foreground bg-background p-2 border border-border/50">{ban.reason}</p>
                  </div>
                  {ban.private_reason && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-muted-foreground">Private Reason:</span>
                      <p className="text-[10px] font-mono text-foreground bg-background p-2 border border-border/50">{ban.private_reason}</p>
                    </div>
                  )}
                  <Button variant="outline" size="sm" className="w-full font-mono text-[10px] h-6" onClick={() => handleUnban(ban.id)}>
                    <ShieldOff className="h-3 w-3 mr-1" /> UNBAN
                  </Button>
                </div>
              )}
            </div>
          ))}
          {inactive.length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-3"><div className="h-px flex-1 bg-border" /><span className="text-[10px] font-mono text-muted-foreground">INACTIVE ({inactive.length})</span><div className="h-px flex-1 bg-border" /></div>
              {inactive.map((ban) => (
                <div key={ban.id} className="border border-border/50 bg-card/50 p-3 opacity-50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{ban.roblox_user_id}</span>
                    <Badge variant="secondary" className="text-[10px] font-mono h-4">INACTIVE</Badge>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">{ban.reason}</p>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
