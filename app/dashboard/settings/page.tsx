"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { Check, Clipboard, Database, Download, KeyRound, LoaderCircle, Moon, ShieldCheck, Sun, Waves } from "lucide-react"
import { useSession } from "@/components/session-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function PrivateSettingsPage() {
  const { activeProject } = useSession()
  const { theme, setTheme } = useTheme()
  const [newCloudKey, setNewCloudKey] = useState("")
  const [relayKey, setRelayKey] = useState<string | null>(null)
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)

  async function revealRelayKey() {
    if (!activeProject) return
    setBusy(true)
    setNotice("")
    try {
      const response = await fetch(`/api/projects/${activeProject.id}/relay-key`)
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Could not load relay key")
      setRelayKey(result.relayKey)
      setNotice("Server relay key is ready. Keep it in ServerScriptService only.")
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load relay key")
    } finally {
      setBusy(false)
    }
  }

  async function copyServerSettings() {
    if (!activeProject || !relayKey) return
    const settings = [
      `local DASHBOARD_URL = "${window.location.origin}"`,
      `local PROJECT_ID = "${activeProject.id}"`,
      `local PROJECT_RELAY_KEY = "${relayKey}"`,
    ].join("\n")
    try {
      await navigator.clipboard.writeText(settings)
      setNotice("Server settings copied. Paste them into the server script configuration.")
    } catch {
      setNotice("Clipboard access was blocked. Select and copy the settings shown below.")
    }
  }

  async function rotateCloudKey() {
    if (!activeProject || !newCloudKey.trim()) return
    setBusy(true)
    setNotice("")
    try {
      const response = await fetch("/api/settings/api-key", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProject.id, newApiKey: newCloudKey.trim() }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Could not update Roblox Cloud key")
      setNewCloudKey("")
      setNotice("Roblox Open Cloud key updated. It is stored server-side and is not the in-game relay key.")
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update Roblox Cloud key")
    } finally {
      setBusy(false)
    }
  }

  if (!activeProject) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <Card>
          <CardHeader>
            <CardTitle>Scuba Simulator is not linked</CardTitle>
            <CardDescription>The private owner account could not find the configured game project.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Refresh the page after checking the project connection.</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-primary">
            <ShieldCheck aria-hidden="true" className="size-4" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Owner-controlled configuration</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Private settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">Only your owner password can open this console.</p>
        </div>
        <Badge variant="outline" className="gap-1.5 border-primary/25 text-primary">
          <Waves aria-hidden="true" className="size-3" /> Scuba Simulator
        </Badge>
      </header>

      {notice && (
        <div role="status" className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
          {notice}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <KeyRound aria-hidden="true" className="size-5" />
            </div>
            <CardTitle>In-game relay</CardTitle>
            <CardDescription>A project-specific key for the Roblox server script. This is separate from your Roblox Open Cloud key.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-lg border border-border/70 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              Keep the relay key in a normal server Script under <code className="font-mono text-foreground">ServerScriptService</code>. Never place it in a LocalScript or a replicated object.
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void revealRelayKey()} disabled={busy}>
                {busy ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : <KeyRound data-icon="inline-start" />}
                Reveal server key
              </Button>
              {relayKey && (
                <Button type="button" onClick={() => void copyServerSettings()}>
                  <Clipboard data-icon="inline-start" /> Copy script settings
                </Button>
              )}
            </div>
            {relayKey && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="relay-settings">Server script settings</Label>
                <textarea
                  id="relay-settings"
                  readOnly
                  rows={4}
                  value={`local DASHBOARD_URL = "${typeof window === "undefined" ? "" : window.location.origin}"\nlocal PROJECT_ID = "${activeProject.id}"\nlocal PROJECT_RELAY_KEY = "${relayKey}"`}
                  className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-xs leading-5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onFocus={(event) => event.currentTarget.select()}
                />
              </div>
            )}
            <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
              <a href="/NexusDashboard.lua" download className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-muted">
                <Download aria-hidden="true" className="size-4" /> Server Script
              </a>
              <a href="/NexusDashboardClient.lua" download className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-muted">
                <Download aria-hidden="true" className="size-4" /> Client UI Script
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Database aria-hidden="true" className="size-5" />
            </div>
            <CardTitle>Roblox Open Cloud</CardTitle>
            <CardDescription>This key stays on the dashboard server for universe administration and messaging.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs leading-relaxed text-muted-foreground">
              Do not paste this key into the in-game script. The script uses the separate project relay key above.
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="open-cloud-key">Replacement Open Cloud key</Label>
              <Input
                id="open-cloud-key"
                type="password"
                autoComplete="new-password"
                value={newCloudKey}
                onChange={(event) => setNewCloudKey(event.target.value)}
                placeholder="Paste a replacement key only when rotating"
              />
            </div>
            <Button type="button" variant="outline" onClick={() => void rotateCloudKey()} disabled={busy || !newCloudKey.trim()}>
              {busy ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : <Check data-icon="inline-start" />}
              Update Open Cloud key
            </Button>
            <p className="text-xs text-muted-foreground">A replacement key must already have the required universe, MessagingService, data-store, and moderation scopes configured in Roblox.</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80 lg:col-span-2">
          <CardHeader>
            <CardTitle>Game binding</CardTitle>
            <CardDescription>The dashboard and relay are pinned to the Scuba Simulator experience you supplied.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Universe ID</p>
              <p className="mt-1 font-mono text-sm">{activeProject.universe_id}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Place ID</p>
              <p className="mt-1 font-mono text-sm">{activeProject.place_id}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Project ID</p>
              <p className="mt-1 break-all font-mono text-sm">{activeProject.id}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80 lg:col-span-2">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Choose the dashboard theme for this browser.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button type="button" variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}>
              <Moon data-icon="inline-start" /> Dark
            </Button>
            <Button type="button" variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}>
              <Sun data-icon="inline-start" /> Light
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
