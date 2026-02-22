"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "@/components/session-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
import { Settings, Key, Users, Shield, Loader2, Trash2, Moon, Sun, Monitor } from "lucide-react"
import { toast } from "sonner"
import { useTheme } from "next-themes"
import { hasPermission, getRoleLabel, getRoleColor, type Role } from "@/lib/roles"

interface UserRoleEntry {
  userId: string
  displayName: string
  role: Role
}

export default function SettingsPage() {
  const { user } = useSession()
  const { theme, setTheme } = useTheme()
  const [newApiKey, setNewApiKey] = useState("")
  const [rotateLoading, setRotateLoading] = useState(false)
  const [confirmRotate, setConfirmRotate] = useState(false)
  const [roles, setRoles] = useState<UserRoleEntry[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [newUserId, setNewUserId] = useState("")
  const [newUserName, setNewUserName] = useState("")
  const [newUserRole, setNewUserRole] = useState<Role>("moderator")

  const isOwner = user?.role === "owner"
  const canManageRoles = user ? hasPermission(user.role as Role, "manage_roles") : false

  const fetchRoles = useCallback(async () => {
    if (!canManageRoles) return
    setRolesLoading(true)
    try {
      const res = await fetch("/api/settings/roles")
      if (res.ok) {
        const data = await res.json()
        setRoles(data.roles)
      }
    } catch {
      toast.error("Failed to fetch roles")
    } finally {
      setRolesLoading(false)
    }
  }, [canManageRoles])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  async function handleRotateKey() {
    if (!newApiKey) return
    setRotateLoading(true)
    try {
      const res = await fetch("/api/settings/api-key", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newApiKey }),
      })
      if (res.ok) {
        toast.success("API key rotated successfully")
        setNewApiKey("")
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to rotate key")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setRotateLoading(false)
      setConfirmRotate(false)
    }
  }

  async function handleAddUser() {
    if (!newUserId || !newUserName) return
    try {
      const res = await fetch("/api/settings/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: newUserId,
          displayName: newUserName,
          role: newUserRole,
        }),
      })
      if (res.ok) {
        toast.success("User role assigned")
        setNewUserId("")
        setNewUserName("")
        fetchRoles()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to assign role")
      }
    } catch {
      toast.error("Network error")
    }
  }

  async function handleChangeRole(userId: string, displayName: string, role: Role) {
    try {
      const res = await fetch("/api/settings/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, displayName, role }),
      })
      if (res.ok) {
        toast.success("Role updated")
        fetchRoles()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to update role")
      }
    } catch {
      toast.error("Network error")
    }
  }

  async function handleRemoveUser(userId: string) {
    try {
      const res = await fetch("/api/settings/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "remove" }),
      })
      if (res.ok) {
        toast.success("User removed")
        fetchRoles()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to remove user")
      }
    } catch {
      toast.error("Network error")
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {/* API Key Management */}
        {isOwner && (
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                <CardTitle className="text-card-foreground">API Key Management</CardTitle>
              </div>
              <CardDescription>
                Rotate your Roblox Open Cloud API key. The current key will be replaced.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newApiKey" className="text-foreground">New API Key</Label>
                <Input
                  id="newApiKey"
                  type="password"
                  placeholder="Enter new API key..."
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                />
              </div>
              <Button
                variant="destructive"
                onClick={() => setConfirmRotate(true)}
                disabled={!newApiKey || rotateLoading}
                className="gap-2"
              >
                <Key className="h-4 w-4" />
                Rotate API Key
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Role Management */}
        {canManageRoles && (
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <CardTitle className="text-card-foreground">User Roles</CardTitle>
              </div>
              <CardDescription>
                Manage who has access to the dashboard and their permission level.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Current Users</h4>
                {rolesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading roles...
                  </div>
                ) : roles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users configured.</p>
                ) : (
                  <div className="space-y-2">
                    {roles.map((r) => (
                      <div
                        key={r.userId}
                        className="flex items-center justify-between rounded-lg border border-border/50 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Shield className={`h-4 w-4 ${getRoleColor(r.role)}`} />
                          <div>
                            <p className="text-sm font-medium text-foreground">{r.displayName}</p>
                            <p className="text-xs text-muted-foreground font-mono">ID: {r.userId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.userId === user?.userId ? (
                            <Badge className={getRoleColor(r.role)}>
                              {getRoleLabel(r.role)} (You)
                            </Badge>
                          ) : (
                            <>
                              <Select
                                value={r.role}
                                onValueChange={(v) => handleChangeRole(r.userId, r.displayName, v as Role)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="moderator">Moderator</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveUser(r.userId)}>
                                <Trash2 className="h-4 w-4 text-destructive-foreground" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Add User</h4>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Input placeholder="Roblox User ID" value={newUserId} onChange={(e) => setNewUserId(e.target.value)} />
                  <Input placeholder="Display Name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
                  <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as Role)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddUser} disabled={!newUserId || !newUserName}>Add User</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Theme */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-card-foreground">Appearance</CardTitle>
            <CardDescription>Customize the dashboard appearance.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant={theme === "light" ? "default" : "outline"} size="sm" onClick={() => setTheme("light")} className="gap-2">
                <Sun className="h-4 w-4" /> Light
              </Button>
              <Button variant={theme === "dark" ? "default" : "outline"} size="sm" onClick={() => setTheme("dark")} className="gap-2">
                <Moon className="h-4 w-4" /> Dark
              </Button>
              <Button variant={theme === "system" ? "default" : "outline"} size="sm" onClick={() => setTheme("system")} className="gap-2">
                <Monitor className="h-4 w-4" /> System
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Permission Reference */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-card-foreground">Permission Reference</CardTitle>
            <CardDescription>Overview of what each role can do.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left font-medium text-foreground">Permission</th>
                    <th className="pb-2 text-center font-medium text-chart-1">Owner</th>
                    <th className="pb-2 text-center font-medium text-chart-2">Admin</th>
                    <th className="pb-2 text-center font-medium text-chart-4">Moderator</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    { perm: "View Statistics", owner: true, admin: true, mod: true },
                    { perm: "Kick Players", owner: true, admin: true, mod: true },
                    { perm: "Ban Players", owner: true, admin: true, mod: false },
                    { perm: "Warn Players", owner: true, admin: true, mod: true },
                    { perm: "Send Announcements", owner: true, admin: true, mod: true },
                    { perm: "Manage Bans", owner: true, admin: true, mod: false },
                    { perm: "Manage Datastores", owner: true, admin: false, mod: false },
                    { perm: "View All Logs", owner: true, admin: true, mod: false },
                    { perm: "View Own Logs", owner: true, admin: true, mod: true },
                    { perm: "Manage Roles", owner: true, admin: false, mod: false },
                    { perm: "Manage API Key", owner: true, admin: false, mod: false },
                    { perm: "Manage Config", owner: true, admin: false, mod: false },
                  ].map((row) => (
                    <tr key={row.perm} className="border-b border-border/50">
                      <td className="py-2 text-foreground">{row.perm}</td>
                      <td className="py-2 text-center">{row.owner ? <span className="text-success">Yes</span> : <span>--</span>}</td>
                      <td className="py-2 text-center">{row.admin ? <span className="text-success">Yes</span> : <span>--</span>}</td>
                      <td className="py-2 text-center">{row.mod ? <span className="text-success">Yes</span> : <span>--</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirm Rotate Dialog */}
      <AlertDialog open={confirmRotate} onOpenChange={setConfirmRotate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate API Key</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace your current API key. All future API calls will use the new key. This action will be logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRotateKey} disabled={rotateLoading}>
              {rotateLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Rotation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
