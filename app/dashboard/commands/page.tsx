"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Send,
  UserX,
  Megaphone,
  Terminal,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldBan,
  AlertTriangle,
  Copy,
} from "lucide-react"
import { toast } from "sonner"
import { useSession } from "@/components/session-provider"
import { hasPermission, type Role } from "@/lib/roles"
import { DateTimePicker } from "@/components/date-time-picker"

type CommandType = "kick" | "ban" | "warn" | "announce"

interface CommandHistoryEntry {
  id: string
  type: string
  details: string
  timestamp: Date
  status: "success" | "error"
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

const LUAU_SCRIPT = `-- ServerScript: DashboardCommandHandler
-- Place this in ServerScriptService

local MessagingService = game:GetService("MessagingService")
local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")

local announceEvent = Instance.new("RemoteEvent")
announceEvent.Name = "DashboardAnnouncement"
announceEvent.Parent = game.ReplicatedStorage

local warnEvent = Instance.new("RemoteEvent")
warnEvent.Name = "DashboardWarning"
warnEvent.Parent = game.ReplicatedStorage

MessagingService:SubscribeAsync("DashboardCommands", function(message)
    local success, data = pcall(function()
        return HttpService:JSONDecode(message.Data)
    end)

    if not success then
        warn("[Dashboard] Failed to decode command:", message.Data)
        return
    end

    if data.type == "kick" then
        local player = Players:GetPlayerByUserId(tonumber(data.userId))
        if player then
            player:Kick("Removed by admin: " .. (data.reason or "No reason"))
        end
    elseif data.type == "warn" then
        local player = Players:GetPlayerByUserId(tonumber(data.userId))
        if player then
            warnEvent:FireClient(player, data.reason, data.issuedBy)
        end
    elseif data.type == "announce" then
        if data.serverId and data.serverId ~= "" then
            if game.JobId == data.serverId then
                announceEvent:FireAllClients(data.message, data.issuedBy)
            end
        else
            announceEvent:FireAllClients(data.message, data.issuedBy)
        end
    elseif data.type == "shutdown_server" then
        if game.JobId == data.serverId then
            for _, player in Players:GetPlayers() do
                player:Kick("Server shutdown by admin")
            end
        end
    end
end)

print("[Dashboard] Command handler initialized")`

export default function CommandsPage() {
  const { user } = useSession()
  const [commandType, setCommandType] = useState<CommandType>("kick")
  const [playerId, setPlayerId] = useState("")
  const [reason, setReason] = useState("")
  const [privateReason, setPrivateReason] = useState("")
  const [message, setMessage] = useState("")
  const [duration, setDuration] = useState("1d")
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [history, setHistory] = useState<CommandHistoryEntry[]>([])
  const [showScript, setShowScript] = useState(false)

  const canKick = user ? hasPermission(user.role as Role, "execute_kick") : false
  const canBan = user ? hasPermission(user.role as Role, "execute_ban") : false
  const canWarn = user ? hasPermission(user.role as Role, "execute_warn") : false
  const canAnnounce = user ? hasPermission(user.role as Role, "execute_announce") : false

  const isValid = () => {
    if (commandType === "kick") return !!playerId && canKick
    if (commandType === "ban") {
      if (!playerId || !canBan) return false
      if (duration === "custom" && !customDate) return false
      return true
    }
    if (commandType === "warn") return !!playerId && !!reason && canWarn
    if (commandType === "announce") return !!message && canAnnounce
    return false
  }

  async function executeCommand() {
    setLoading(true)
    try {
      let detailStr = ""

      if (commandType === "ban") {
        // Use Roblox Ban API via /api/bans
        const banRes = await fetch("/api/bans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            robloxUserId: playerId,
            reason,
            privateReason,
            duration,
            ...(duration === "custom" && customDate ? { expiresAt: customDate.toISOString() } : {}),
          }),
        })
        const banData = await banRes.json()

        // Also kick via messaging service
        await fetch("/api/commands", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "kick", userId: playerId, reason: `Banned: ${reason || "No reason"}` }),
        })

        detailStr = `Ban user ${playerId} (${duration}): ${reason || "No reason"}`

        const entry: CommandHistoryEntry = {
          id: crypto.randomUUID(),
          type: "ban",
          details: detailStr,
          timestamp: new Date(),
          status: banRes.ok ? "success" : "error",
        }
        setHistory((prev) => [entry, ...prev].slice(0, 20))

        if (banRes.ok) {
          toast.success(banData.message || "Ban applied via Roblox Ban API")
          setPlayerId("")
          setReason("")
          setPrivateReason("")
          setCustomDate(undefined)
        } else {
          toast.error(banData.error || "Ban failed")
        }
      } else {
        const payload =
          commandType === "kick"
            ? { type: "kick", userId: playerId, reason }
            : commandType === "warn"
              ? { type: "warn", userId: playerId, reason }
              : { type: "announce", message }

        const res = await fetch("/api/commands", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        const data = await res.json()

        detailStr =
          commandType === "kick"
            ? `Kick user ${playerId}: ${reason || "No reason"}`
            : commandType === "warn"
              ? `Warn user ${playerId}: ${reason}`
              : `Announce: ${message}`

        const entry: CommandHistoryEntry = {
          id: crypto.randomUUID(),
          type: commandType,
          details: detailStr,
          timestamp: new Date(),
          status: res.ok ? "success" : "error",
        }
        setHistory((prev) => [entry, ...prev].slice(0, 20))

        if (res.ok) {
          toast.success(data.message || "Command executed successfully")
          setPlayerId("")
          setReason("")
          setPrivateReason("")
          setMessage("")
          setCustomDate(undefined)
        } else {
          toast.error(data.error || "Command failed")
        }
      }
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setLoading(false)
      setConfirmOpen(false)
    }
  }

  const getConfirmMessage = () => {
    switch (commandType) {
      case "kick":
        return `Are you sure you want to kick user ${playerId}?`
      case "ban": {
        const durationLabel = duration === "custom" && customDate
          ? `until ${customDate.toLocaleString()}`
          : DURATION_OPTIONS.find((d) => d.value === duration)?.label ?? duration
        return `Are you sure you want to ban user ${playerId} for ${durationLabel}? This will use Roblox's Ban API.`
      }
      case "warn":
        return `Are you sure you want to warn user ${playerId}?`
      case "announce":
        return `Are you sure you want to broadcast this announcement to all players?`
    }
  }

  return (
    <div className="space-y-6">
      {/* Command Type Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { type: "kick" as const, icon: UserX, label: "Kick", perm: canKick },
          { type: "ban" as const, icon: ShieldBan, label: "Ban", perm: canBan },
          { type: "warn" as const, icon: AlertTriangle, label: "Warn", perm: canWarn },
          { type: "announce" as const, icon: Megaphone, label: "Announce", perm: canAnnounce },
        ].map((cmd) => (
          <Button
            key={cmd.type}
            variant={commandType === cmd.type ? "default" : "outline"}
            size="sm"
            onClick={() => setCommandType(cmd.type)}
            disabled={!cmd.perm}
            className="gap-1.5"
          >
            <cmd.icon className="h-3.5 w-3.5" />
            {cmd.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Command Form */}
        <Card className="border-border/50 lg:col-span-3">
          <CardHeader className="pb-4">
            <CardTitle className="text-card-foreground flex items-center gap-2 text-base">
              <Terminal className="h-4 w-4 text-primary" />
              Execute Command
            </CardTitle>
            <CardDescription>
              {commandType === "ban"
                ? "Ban data is sent to your game via MessagingService. The player will also be kicked."
                : "Send commands to your Roblox experience via MessagingService."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(commandType === "kick" || commandType === "ban" || commandType === "warn") && (
              <div className="space-y-2">
                <Label htmlFor="playerId" className="text-foreground text-sm">Player User ID</Label>
                <Input
                  id="playerId"
                  placeholder="e.g. 123456789"
                  value={playerId}
                  onChange={(e) => setPlayerId(e.target.value)}
                  className="font-mono"
                />
              </div>
            )}

            {(commandType === "kick" || commandType === "ban" || commandType === "warn") && (
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-foreground text-sm">
                  Reason (shown to player) {commandType === "warn" ? "" : "(optional)"}
                </Label>
                <Input
                  id="reason"
                  placeholder={`Reason for ${commandType}...`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={200}
                />
              </div>
            )}

            {commandType === "ban" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="privateReason" className="text-foreground text-sm">
                    Private Reason (internal only, not visible to player)
                  </Label>
                  <Input
                    id="privateReason"
                    placeholder="Internal reason for this ban..."
                    value={privateReason}
                    onChange={(e) => setPrivateReason(e.target.value)}
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground text-sm">Ban Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
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

                {duration === "custom" && (
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

            {commandType === "announce" && (
              <div className="space-y-2">
                <Label htmlFor="message" className="text-foreground text-sm">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your announcement..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  {message.length}/500 characters
                </p>
              </div>
            )}

            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={loading || !isValid()}
              className="w-full gap-2"
            >
              <Send className="h-4 w-4" />
              Execute
            </Button>
          </CardContent>
        </Card>

        {/* Command History */}
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-card-foreground text-base">History</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowScript(!showScript)}
                className="text-xs text-muted-foreground"
              >
                {showScript ? "Show History" : "Luau Script"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showScript ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Place this ServerScript in ServerScriptService to handle dashboard commands (bans are handled via Roblox Ban API):
                </p>
                <div className="relative">
                  <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-muted/50 p-3 text-[11px] font-mono leading-relaxed text-foreground">
                    {LUAU_SCRIPT}
                  </pre>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute right-2 top-2 h-7 gap-1 text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(LUAU_SCRIPT)
                      toast.success("Script copied")
                    }}
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </Button>
                </div>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="mb-2 h-6 w-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No commands executed yet.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-auto">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2.5 rounded-md border border-border/50 p-2.5"
                  >
                    {entry.status === "success" ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                    ) : (
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {entry.type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {entry.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-foreground truncate">
                        {entry.details}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Command</AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmMessage()} This action will be logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeCommand} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Execute
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
