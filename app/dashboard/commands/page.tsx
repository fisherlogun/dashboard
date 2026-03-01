"use client"

import { useState } from "react"
import { useSession } from "@/components/session-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Terminal, Loader2, Zap, Megaphone, AlertTriangle, ShieldBan, Send, CheckCircle2, XCircle, Clock } from "lucide-react"
import { toast } from "sonner"
import { DateTimePicker } from "@/components/date-time-picker"

type CmdType = "kick" | "ban" | "warn" | "announce"
interface HistoryEntry { id: string; type: string; details: string; time: Date; ok: boolean }

export default function CommandsPage() {
  const { activeProject } = useSession()
  const [type, setType] = useState<CmdType>("kick")
  const [userId, setUserId] = useState("")
  const [reason, setReason] = useState("")
  const [privateReason, setPrivateReason] = useState("")
  const [message, setMessage] = useState("")
  const [serverId, setServerId] = useState("")
  const [duration, setDuration] = useState("1d")
  const [customDate, setCustomDate] = useState<Date | undefined>()
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const execute = async () => {
    if (!activeProject) return
    setSending(true)
    try {
      const payload: Record<string, unknown> = { projectId: activeProject.id, type }
      let detail = ""
      if (type === "kick") {
        if (!userId.trim()) { toast.error("User ID required"); setSending(false); return }
        payload.userId = userId.trim(); payload.reason = reason.trim() || "No reason"
        detail = `Kick ${userId}: ${reason || "No reason"}`
      } else if (type === "warn") {
        if (!userId.trim() || !reason.trim()) { toast.error("User ID and reason required"); setSending(false); return }
        payload.userId = userId.trim(); payload.reason = reason.trim()
        detail = `Warn ${userId}: ${reason}`
      } else if (type === "ban") {
        if (!userId.trim() || !reason.trim()) { toast.error("User ID and reason required"); setSending(false); return }
        payload.userId = userId.trim(); payload.reason = reason.trim(); payload.privateReason = privateReason.trim(); payload.duration = duration
        if (duration === "custom" && customDate) {
          payload.durationSeconds = Math.max(0, Math.floor((customDate.getTime() - Date.now()) / 1000))
          payload.expiresAt = customDate.toISOString()
        } else if (duration !== "permanent") {
          const m: Record<string, number> = { "1h": 3600, "6h": 21600, "12h": 43200, "1d": 86400, "3d": 259200, "7d": 604800, "30d": 2592000 }
          payload.durationSeconds = m[duration] ?? null
        }
        detail = `Ban ${userId} (${duration}): ${reason}`
      } else {
        if (!message.trim()) { toast.error("Message required"); setSending(false); return }
        payload.message = message.trim()
        if (serverId.trim()) payload.serverId = serverId.trim()
        detail = `Announce: ${message.slice(0, 50)}`
      }
      const res = await fetch("/api/commands", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const ok = res.ok
      setHistory((h) => [{ id: crypto.randomUUID(), type, details: detail, time: new Date(), ok }, ...h].slice(0, 20))
      if (ok) { toast.success(`${type.toUpperCase()} sent`); setUserId(""); setReason(""); setPrivateReason(""); setMessage(""); setServerId("") }
      else { const d = await res.json(); toast.error(d.error || "Failed") }
    } catch { toast.error("Network error") } finally { setSending(false) }
  }

  if (!activeProject) return <div className="flex items-center justify-center h-64 text-muted-foreground font-mono text-xs">NO_PROJECT_SELECTED</div>

  const cmds: { type: CmdType; label: string; icon: typeof Zap; color: string }[] = [
    { type: "kick", label: "KICK", icon: Zap, color: "text-chart-4" },
    { type: "ban", label: "BAN", icon: ShieldBan, color: "text-destructive" },
    { type: "warn", label: "WARN", icon: AlertTriangle, color: "text-chart-3" },
    { type: "announce", label: "ANNOUNCE", icon: Megaphone, color: "text-primary" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Terminal className="h-4 w-4 text-primary" />
        <h1 className="text-sm font-mono font-bold text-foreground uppercase tracking-wider">Command Console</h1>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {cmds.map((c) => (
          <button key={c.type} onClick={() => setType(c.type)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider border transition-colors ${type === c.type ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>
            <c.icon className={`h-3 w-3 ${type === c.type ? "text-primary" : c.color}`} />{c.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <div className="h-2 w-2 bg-chart-2 animate-pulse" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">CMD::{type.toUpperCase()} // {activeProject.name}</span>
          </div>

          {(type === "kick" || type === "warn" || type === "ban") && (
            <div className="space-y-1">
              <Label className="text-[10px] font-mono text-muted-foreground uppercase">Target User ID</Label>
              <Input placeholder="123456789" value={userId} onChange={(e) => setUserId(e.target.value)} className="font-mono text-xs h-8" />
            </div>
          )}
          {(type === "kick" || type === "warn") && (
            <div className="space-y-1">
              <Label className="text-[10px] font-mono text-muted-foreground uppercase">Reason{type === "warn" ? "" : " (optional)"}</Label>
              <Input placeholder="Reason..." value={reason} onChange={(e) => setReason(e.target.value)} className="font-mono text-xs h-8" />
            </div>
          )}
          {type === "ban" && (
            <>
              <div className="space-y-1">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase">Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="font-mono text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{["1h","6h","12h","1d","3d","7d","30d","permanent","custom"].map((d) => (<SelectItem key={d} value={d} className="font-mono text-xs">{d.toUpperCase()}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              {duration === "custom" && <DateTimePicker date={customDate} onDateChange={setCustomDate} />}
              <div className="space-y-1">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase">Display Reason</Label>
                <Textarea placeholder="Shown to player..." value={reason} onChange={(e) => setReason(e.target.value)} className="font-mono text-xs min-h-[50px] resize-none" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase">Private Reason</Label>
                <Input placeholder="Internal..." value={privateReason} onChange={(e) => setPrivateReason(e.target.value)} className="font-mono text-xs h-8" />
              </div>
            </>
          )}
          {type === "announce" && (
            <>
              <div className="space-y-1">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase">Message</Label>
                <Textarea placeholder="Announcement..." value={message} onChange={(e) => setMessage(e.target.value)} className="font-mono text-xs min-h-[80px] resize-none" maxLength={500} />
                <p className="text-[10px] font-mono text-muted-foreground text-right">{message.length}/500</p>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase">Server ID (optional)</Label>
                <Input placeholder="Blank = all servers" value={serverId} onChange={(e) => setServerId(e.target.value)} className="font-mono text-xs h-8" />
              </div>
            </>
          )}
          <Button className="gap-1.5 font-mono text-xs uppercase tracking-wider h-8" onClick={execute} disabled={sending}>
            {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Execute
          </Button>
        </div>

        <div className="lg:col-span-2 border border-border bg-card p-4 space-y-3">
          <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Clock className="h-3 w-3" /> Session History</h2>
          {history.length === 0 ? (
            <p className="text-[10px] font-mono text-muted-foreground text-center py-8">NO_COMMANDS_YET</p>
          ) : (
            <div className="space-y-1 max-h-80 overflow-auto">
              {history.map((e) => (
                <div key={e.id} className="flex items-start gap-2 border border-border/50 p-2">
                  {e.ok ? <CheckCircle2 className="h-3 w-3 text-chart-2 mt-0.5 shrink-0" /> : <XCircle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] font-mono h-4 px-1">{e.type.toUpperCase()}</Badge>
                      <span className="text-[10px] font-mono text-muted-foreground">{e.time.toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[10px] font-mono text-foreground truncate mt-0.5">{e.details}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
