"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Cpu, Plus } from "lucide-react"
import { toast } from "sonner"
import { useSession } from "@/components/session-provider"
import { useEffect } from "react"

export default function SetupPage() {
  const router = useRouter()
  const { user, refreshProjects } = useSession()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [universeId, setUniverseId] = useState("")
  const [placeId, setPlaceId] = useState("")

  async function handleCreate() {
    if (!name || !apiKey || !universeId || !placeId) {
      toast.error("All fields are required")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, apiKey, universeId, placeId }),
      })
      const data = await res.json()
      if (res.ok && data.project) {
        toast.success("Project created")
        await refreshProjects()
        router.push("/dashboard")
      } else {
        toast.error(data.error || "Failed to create project")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <Cpu className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-mono font-bold text-foreground uppercase tracking-wider">New Project</h1>
          <p className="text-xs font-mono text-muted-foreground">
            {user ? `${user.displayName} // ` : ""}Create a new Roblox project to manage
          </p>
        </div>

        <div className="border border-border bg-card p-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Project Name</Label>
            <Input placeholder="My Game" value={name} onChange={(e) => setName(e.target.value)} className="font-mono text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Open Cloud API Key</Label>
            <Input type="password" placeholder="Enter API key..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="font-mono text-sm" />
            <p className="text-[10px] font-mono text-muted-foreground">
              Create at{" "}
              <a href="https://create.roblox.com/dashboard/credentials" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                create.roblox.com/dashboard/credentials
              </a>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Universe ID</Label>
              <Input placeholder="123456789" value={universeId} onChange={(e) => setUniverseId(e.target.value)} className="font-mono text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Place ID</Label>
              <Input placeholder="987654321" value={placeId} onChange={(e) => setPlaceId(e.target.value)} className="font-mono text-sm" />
            </div>
          </div>

          <Button className="w-full gap-2 font-mono text-xs uppercase tracking-wider" onClick={handleCreate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Project
          </Button>
        </div>

        <p className="text-center text-[10px] font-mono text-muted-foreground">
          Only the project owner can see the API key. Team members you invite will never see it.
        </p>
      </div>
    </div>
  )
}
