"use client"

import { useState, useCallback, useEffect } from "react"
import { useSession } from "@/components/session-provider"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { KeyRound, Plus, Trash2, Search, Shield, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface License {
  user_id: string
  display_name?: string
  granted_by_name: string
  granted_at: string
  active: boolean
}

export default function AdminPage() {
  const { user, loading } = useSession()
  const router = useRouter()
  const [licenses, setLicenses] = useState<License[]>([])
  const [fetching, setFetching] = useState(true)
  const [userId, setUserId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState("")

  const fetchLicenses = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/licenses")
      if (res.ok) { const d = await res.json(); setLicenses(d.licenses ?? []) }
    } catch { toast.error("Failed to fetch licenses") } finally { setFetching(false) }
  }, [])

  useEffect(() => {
    if (!loading && user) {
      if (!user.isGlobalAdmin) { router.push("/dashboard"); return }
      fetchLicenses()
    }
  }, [loading, user, router, fetchLicenses])

  const handleGrant = async () => {
    if (!userId.trim()) { toast.error("User ID required"); return }
    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/licenses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ robloxUserId: userId.trim() }),
      })
      if (res.ok) { toast.success("License granted"); setUserId(""); fetchLicenses() }
      else { const d = await res.json(); toast.error(d.error || "Failed") }
    } catch { toast.error("Network error") } finally { setSubmitting(false) }
  }

  const handleRevoke = async (uid: string) => {
    try {
      const res = await fetch(`/api/admin/licenses?userId=${uid}`, { method: "DELETE" })
      if (res.ok) { toast.success("Revoked"); fetchLicenses() }
    } catch { toast.error("Failed") }
  }

  if (loading || !user?.isGlobalAdmin) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
  }

  const active = licenses.filter((l) => l.active)
  const filtered = licenses.filter((l) => l.user_id.includes(search) || l.display_name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <h1 className="text-sm font-mono font-bold text-foreground uppercase tracking-wider">Global Admin</h1>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "ACTIVE", val: active.length },
          { label: "TOTAL", val: licenses.length },
          { label: "REVOKED", val: licenses.length - active.length },
        ].map((s) => (
          <div key={s.label} className="border border-border bg-card p-3 text-center">
            <div className="text-lg font-mono font-bold text-foreground">{s.val}</div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="border border-border bg-card p-4 space-y-3">
        <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Plus className="h-3 w-3" /> Grant License</h2>
        <p className="text-[10px] font-mono text-muted-foreground">Licensed Roblox users can sign in via OAuth and create projects.</p>
        <div className="flex gap-2">
          <Input placeholder="Roblox User ID" value={userId} onChange={(e) => setUserId(e.target.value)} className="font-mono text-xs h-8 flex-1" />
          <Button size="sm" className="gap-1 font-mono text-xs uppercase h-8" onClick={handleGrant} disabled={submitting || !userId.trim()}>
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <KeyRound className="h-3 w-3" />} Grant
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="Search licenses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 font-mono text-xs h-8" />
      </div>

      {fetching ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-xs font-mono text-muted-foreground text-center py-8">{search ? "NO_MATCHES" : "NO_LICENSES"}</p>
      ) : (
        <div className="space-y-1">
          {filtered.map((l) => (
            <div key={l.user_id} className="border border-border bg-card p-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-foreground">{l.display_name || l.user_id}</span>
                  <Badge variant={l.active ? "default" : "secondary"} className="text-[10px] font-mono h-4">{l.active ? "ACTIVE" : "REVOKED"}</Badge>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground mt-0.5">
                  <span>ID: {l.user_id}</span>
                  <span>by {l.granted_by_name}</span>
                  <span>{new Date(l.granted_at).toLocaleDateString()}</span>
                </div>
              </div>
              {l.active && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRevoke(l.user_id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
