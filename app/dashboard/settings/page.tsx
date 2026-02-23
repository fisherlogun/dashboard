"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "@/components/session-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Key, Users, Shield, Loader2, Trash2, Plus, Moon, Sun, Monitor } from "lucide-react"
import { toast } from "sonner"
import { useTheme } from "next-themes"

interface MemberEntry {
  user_id: string
  display_name: string
  role: string
}

export default function SettingsPage() {
  const { user, activeProject } = useSession()
  const { theme, setTheme } = useTheme()
  const [newApiKey, setNewApiKey] = useState("")
  const [rotateLoading, setRotateLoading] = useState(false)
  const [members, setMembers] = useState<MemberEntry[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [newUserId, setNewUserId] = useState("")
  const [newRole, setNewRole] = useState("moderator")

  const myRole = activeProject?.role
  const isOwner = myRole === "owner"

  const fetchMembers = useCallback(async () => {
    if (!activeProject || !isOwner) return
    setMembersLoading(true)
    try {
      const res = await fetch(`/api/settings/roles?projectId=${activeProject.id}`)
      if (res.ok) { const d = await res.json(); setMembers(d.members ?? []) }
    } catch { /* */ } finally { setMembersLoading(false) }
  }, [activeProject, isOwner])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const handleRotate = async () => {
    if (!activeProject || !newApiKey) return
    setRotateLoading(true)
    try {
      const res = await fetch("/api/settings/api-key", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProject.id, newApiKey }),
      })
      if (res.ok) { toast.success("API key rotated"); setNewApiKey("") }
      else { const d = await res.json(); toast.error(d.error || "Failed") }
    } catch { toast.error("Network error") } finally { setRotateLoading(false) }
  }

  const handleAddMember = async () => {
    if (!activeProject || !newUserId) return
    try {
      const res = await fetch("/api/settings/roles", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProject.id, userId: newUserId, role: newRole }),
      })
      if (res.ok) { toast.success("Member added"); setNewUserId(""); fetchMembers() }
      else { const d = await res.json(); toast.error(d.error || "Failed") }
    } catch { toast.error("Network error") }
  }

  const handleChangeRole = async (userId: string, role: string) => {
    if (!activeProject) return
    try {
      const res = await fetch("/api/settings/roles", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProject.id, userId, role }),
      })
      if (res.ok) { toast.success("Role updated"); fetchMembers() }
    } catch { toast.error("Failed") }
  }

  const handleRemove = async (userId: string) => {
    if (!activeProject) return
    try {
      const res = await fetch("/api/settings/roles", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProject.id, userId, action: "remove" }),
      })
      if (res.ok) { toast.success("Removed"); fetchMembers() }
    } catch { toast.error("Failed") }
  }

  if (!activeProject) return <div className="flex items-center justify-center h-64 text-muted-foreground font-mono text-xs">NO_PROJECT_SELECTED</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4 text-primary" />
        <h1 className="text-sm font-mono font-bold text-foreground uppercase tracking-wider">Settings</h1>
      </div>

      {/* Project Info */}
      <div className="border border-border bg-card p-4 space-y-2">
        <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Project Info</h2>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <span className="text-muted-foreground">Name</span><span className="text-foreground">{activeProject.name}</span>
          <span className="text-muted-foreground">Your Role</span>
          <Badge variant="outline" className="text-[10px] font-mono w-fit">{myRole?.toUpperCase()}</Badge>
        </div>
      </div>

      {/* API Key (owner only) */}
      {isOwner && (
        <div className="border border-border bg-card p-4 space-y-3">
          <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Key className="h-3 w-3" /> Rotate API Key</h2>
          <div className="space-y-1">
            <Label className="text-[10px] font-mono text-muted-foreground uppercase">New API Key</Label>
            <Input type="password" placeholder="Enter new key..." value={newApiKey} onChange={(e) => setNewApiKey(e.target.value)} className="font-mono text-xs h-8" />
          </div>
          <Button variant="destructive" size="sm" className="gap-1.5 font-mono text-xs uppercase h-7" onClick={handleRotate} disabled={!newApiKey || rotateLoading}>
            {rotateLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Key className="h-3 w-3" />} Rotate Key
          </Button>
        </div>
      )}

      {/* Members (owner only) */}
      {isOwner && (
        <div className="border border-border bg-card p-4 space-y-3">
          <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Users className="h-3 w-3" /> Team Members</h2>
          {membersLoading ? (
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Loading...</div>
          ) : members.length === 0 ? (
            <p className="text-xs font-mono text-muted-foreground">No members.</p>
          ) : (
            <div className="space-y-1">
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center justify-between border border-border/50 p-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3 w-3 text-primary" />
                    <span className="text-xs font-mono text-foreground">{m.display_name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">({m.user_id})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {m.user_id === user?.userId ? (
                      <Badge variant="outline" className="text-[10px] font-mono">{m.role.toUpperCase()} (YOU)</Badge>
                    ) : (
                      <>
                        <Select value={m.role} onValueChange={(v) => handleChangeRole(m.user_id, v)}>
                          <SelectTrigger className="font-mono text-[10px] h-6 w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin" className="font-mono text-xs">Admin</SelectItem>
                            <SelectItem value="moderator" className="font-mono text-xs">Moderator</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemove(m.user_id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-end pt-2 border-t border-border/50">
            <div className="space-y-1 flex-1">
              <Label className="text-[10px] font-mono text-muted-foreground uppercase">Roblox User ID</Label>
              <Input placeholder="123456789" value={newUserId} onChange={(e) => setNewUserId(e.target.value)} className="font-mono text-xs h-7" />
            </div>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="font-mono text-xs h-7 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin" className="font-mono text-xs">Admin</SelectItem>
                <SelectItem value="moderator" className="font-mono text-xs">Moderator</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="h-7 gap-1 font-mono text-xs" onClick={handleAddMember} disabled={!newUserId}>
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>
        </div>
      )}

      {/* Theme */}
      <div className="border border-border bg-card p-4 space-y-3">
        <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Appearance</h2>
        <div className="flex gap-1.5">
          {[
            { val: "light", icon: Sun, label: "LIGHT" },
            { val: "dark", icon: Moon, label: "DARK" },
            { val: "system", icon: Monitor, label: "SYSTEM" },
          ].map((t) => (
            <button key={t.val} onClick={() => setTheme(t.val)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase border transition-colors ${theme === t.val ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
              <t.icon className="h-3 w-3" />{t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
