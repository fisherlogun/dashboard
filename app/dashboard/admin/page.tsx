"use client"

import { useState, useCallback, useEffect } from "react"
import { useSession } from "@/components/session-provider"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { KeyRound, Plus, Trash2, Search, Shield } from "lucide-react"
import { toast } from "sonner"

interface License {
  robloxUserId: string
  robloxDisplayName: string
  grantedBy: string
  grantedByName: string
  grantedAt: string
  active: boolean
}

export default function AdminPage() {
  const { user, loading } = useSession()
  const router = useRouter()
  const [licenses, setLicenses] = useState<License[]>([])
  const [fetching, setFetching] = useState(true)
  const [userId, setUserId] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState("")

  const fetchLicenses = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/licenses")
      if (res.ok) {
        const data = await res.json()
        setLicenses(data.licenses)
      }
    } catch {
      toast.error("Failed to fetch licenses")
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    if (!loading && user) {
      if (!user.isGlobalAdmin) {
        router.push("/dashboard")
        return
      }
      fetchLicenses()
    }
  }, [loading, user, router, fetchLicenses])

  const handleGrant = async () => {
    if (!userId.trim() || !displayName.trim()) {
      toast.error("Both User ID and Display Name are required")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          robloxUserId: userId.trim(),
          robloxDisplayName: displayName.trim(),
        }),
      })
      if (res.ok) {
        toast.success(`License granted to ${displayName.trim()}`)
        setUserId("")
        setDisplayName("")
        fetchLicenses()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to grant license")
      }
    } catch {
      toast.error("Failed to grant license")
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async (robloxUserId: string, name: string) => {
    try {
      const res = await fetch(`/api/admin/licenses?userId=${robloxUserId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        toast.success(`License revoked from ${name}`)
        fetchLicenses()
      }
    } catch {
      toast.error("Failed to revoke license")
    }
  }

  if (loading || !user?.isGlobalAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const filtered = licenses.filter(
    (l) =>
      l.robloxDisplayName.toLowerCase().includes(search.toLowerCase()) ||
      l.robloxUserId.includes(search)
  )

  const activeLicenses = licenses.filter((l) => l.active)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Global Admin</h1>
          <p className="text-sm text-muted-foreground">Manage dashboard access. Only licensed Roblox users can sign in.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">{activeLicenses.length}</div>
            <p className="text-xs text-muted-foreground">Active Licenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">{licenses.length}</div>
            <p className="text-xs text-muted-foreground">Total Licenses</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">{licenses.filter((l) => !l.active).length}</div>
            <p className="text-xs text-muted-foreground">Revoked</p>
          </CardContent>
        </Card>
      </div>

      {/* Grant License */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4 text-primary" />
            Grant License
          </CardTitle>
          <CardDescription>
            Add a Roblox user who can sign in to the dashboard via Roblox OAuth. You are automatically whitelisted as the global admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Roblox User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="font-mono sm:max-w-48"
            />
            <Input
              placeholder="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="sm:max-w-64"
            />
            <Button
              onClick={handleGrant}
              disabled={submitting || !userId.trim() || !displayName.trim()}
              className="gap-2"
            >
              <KeyRound className="h-3.5 w-3.5" />
              {submitting ? "Granting..." : "Grant"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* License List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Licensed Users</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-9 text-sm w-52"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {fetching ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {search ? "No licenses match your search." : "No licenses granted yet."}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((license) => (
                <div
                  key={license.robloxUserId}
                  className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                      {license.robloxDisplayName[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {license.robloxDisplayName}
                        </span>
                        <Badge variant={license.active ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                          {license.active ? "Active" : "Revoked"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{license.robloxUserId}</span>
                        <span>{"by " + license.grantedByName}</span>
                        <span>{new Date(license.grantedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  {license.active && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive-foreground hover:text-destructive-foreground hover:bg-destructive/10"
                      onClick={() => handleRevoke(license.robloxUserId, license.robloxDisplayName)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Revoke license</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
