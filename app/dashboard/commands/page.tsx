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
import { Loader2, Send, UserX, Megaphone, Terminal, Clock, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { useSession } from "@/components/session-provider"
import { hasPermission, type Role } from "@/lib/roles"

interface CommandHistoryEntry {
  id: string
  type: string
  details: string
  timestamp: Date
  status: "success" | "error"
}

const LUAU_SCRIPT = `-- ServerScript: DashboardCommandHandler
-- Place this in ServerScriptService

local MessagingService = game:GetService("MessagingService")
local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")

-- Create a RemoteEvent for announcements
local announceEvent = Instance.new("RemoteEvent")
announceEvent.Name = "DashboardAnnouncement"
announceEvent.Parent = game.ReplicatedStorage

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
            print("[Dashboard] Kicked player:", data.userId)
        else
            warn("[Dashboard] Player not in server:", data.userId)
        end
    elseif data.type == "announce" then
        announceEvent:FireAllClients(data.message, data.issuedBy)
        print("[Dashboard] Announcement sent:", data.message)
    end
end)

print("[Dashboard] Command handler initialized")`

export default function CommandsPage() {
  const { user } = useSession()
  const [commandType, setCommandType] = useState<"kick" | "announce">("kick")
  const [playerId, setPlayerId] = useState("")
  const [reason, setReason] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [history, setHistory] = useState<CommandHistoryEntry[]>([])
  const [showScript, setShowScript] = useState(false)

  const canKick = user ? hasPermission(user.role as Role, "execute_kick") : false
  const canAnnounce = user
    ? hasPermission(user.role as Role, "execute_announce")
    : false

  async function executeCommand() {
    setLoading(true)
    try {
      const payload =
        commandType === "kick"
          ? { type: "kick", userId: playerId, reason }
          : { type: "announce", message }

      const res = await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      const entry: CommandHistoryEntry = {
        id: crypto.randomUUID(),
        type: commandType,
        details:
          commandType === "kick"
            ? `Kick user ${playerId}: ${reason || "No reason"}`
            : `Announce: ${message}`,
        timestamp: new Date(),
        status: res.ok ? "success" : "error",
      }
      setHistory((prev) => [entry, ...prev].slice(0, 20))

      if (res.ok) {
        toast.success(data.message || "Command executed successfully")
        // Clear fields
        if (commandType === "kick") {
          setPlayerId("")
          setReason("")
        } else {
          setMessage("")
        }
      } else {
        toast.error(data.error || "Command failed")
      }
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setLoading(false)
      setConfirmOpen(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Terminal className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Command Console</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Command Form */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-card-foreground">Execute Command</CardTitle>
            <CardDescription>
              Send commands to your Roblox experience via MessagingService.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Command Type</Label>
              <Select
                value={commandType}
                onValueChange={(v) => setCommandType(v as "kick" | "announce")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kick" disabled={!canKick}>
                    <div className="flex items-center gap-2">
                      <UserX className="h-4 w-4" />
                      Kick Player
                    </div>
                  </SelectItem>
                  <SelectItem value="announce" disabled={!canAnnounce}>
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4" />
                      Global Announcement
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {commandType === "kick" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="playerId" className="text-foreground">Player User ID</Label>
                  <Input
                    id="playerId"
                    placeholder="Enter Roblox user ID..."
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-foreground">Reason (optional)</Label>
                  <Input
                    id="reason"
                    placeholder="Reason for kicking..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={200}
                  />
                </div>
              </>
            )}

            {commandType === "announce" && (
              <div className="space-y-2">
                <Label htmlFor="message" className="text-foreground">Announcement Message</Label>
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
              disabled={
                loading ||
                (commandType === "kick" && (!playerId || !canKick)) ||
                (commandType === "announce" && (!message || !canAnnounce))
              }
              className="w-full gap-2"
            >
              <Send className="h-4 w-4" />
              Execute Command
            </Button>
          </CardContent>
        </Card>

        {/* Command History */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-card-foreground">Recent Commands</CardTitle>
                <CardDescription>History of commands sent this session.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowScript(!showScript)}
              >
                {showScript ? "Hide Script" : "Luau Script"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showScript ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Paste this ServerScript into your Roblox experience to receive dashboard commands:
                </p>
                <div className="relative">
                  <pre className="max-h-80 overflow-auto rounded-lg border border-border bg-muted/50 p-4 text-xs font-mono text-foreground">
                    {LUAU_SCRIPT}
                  </pre>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute right-2 top-2"
                    onClick={() => {
                      navigator.clipboard.writeText(LUAU_SCRIPT)
                      toast.success("Script copied to clipboard")
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No commands executed yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-auto">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 rounded-lg border border-border/50 p-3"
                  >
                    {entry.status === "success" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {entry.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {entry.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-foreground truncate">
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
              {commandType === "kick"
                ? `Are you sure you want to kick user ${playerId}? This action will be logged.`
                : `Are you sure you want to send this announcement to all players? This action will be logged.`}
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
