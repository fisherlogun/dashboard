"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, LockKeyhole, Waves } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSession } from "@/components/session-provider"

export default function PrivateLoginPage() {
  const router = useRouter()
  const { user, loading, refresh } = useSession()
  const [ownerId, setOwnerId] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard")
  }, [loading, router, user])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ownerId, password }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Sign-in failed")
      await refresh()
      router.replace("/dashboard")
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,229,255,0.09),transparent_52%)]" />
      <div className="relative w-full max-w-md">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center border border-primary/40 bg-primary/10 text-primary">
              <Waves aria-hidden="true" className="size-5" />
            </div>
            <div>
              <p className="font-mono text-xs font-semibold tracking-[0.2em] text-foreground">SCUBA SIMULATOR</p>
              <p className="mt-1 font-mono text-[10px] tracking-wider text-muted-foreground">PRIVATE OPERATIONS</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 border border-border bg-card px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <LockKeyhole aria-hidden="true" className="size-3 text-primary" /> Owner only
          </span>
        </header>

        <section className="border border-border bg-card p-6 shadow-2xl sm:p-8">
          <div className="mb-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Secure access</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">Sign in to your console</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Sign-in is limited to the configured Roblox owner ID and its private password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="owner-id">Roblox owner user ID</Label>
              <Input
                id="owner-id"
                type="text"
                inputMode="numeric"
                autoComplete="username"
                autoFocus
                required
                maxLength={20}
                pattern="[0-9]+"
                value={ownerId}
                onChange={(event) => setOwnerId(event.target.value.replace(/\D/g, "").slice(0, 20))}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
                placeholder="Enter the configured owner ID"
                className="h-11 font-mono"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="owner-password">Owner password</Label>
              <Input
                id="owner-password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={256}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
                placeholder="Enter your private password"
                className="h-11 font-mono"
              />
              {error && (
                <p id="login-error" role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
            <Button type="submit" disabled={busy || ownerId.length === 0 || password.length === 0} className="h-11 w-full">
              {busy ? "Verifying access…" : "Enter private console"}
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </form>

          <div className="mt-7 border-t border-border pt-5">
            <div className="flex items-start gap-3 text-xs leading-5 text-muted-foreground">
              <LockKeyhole aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <p>Roblox OAuth is disabled. Private access checks the owner ID allowlist and password, then issues a short-lived encrypted session.</p>
            </div>
          </div>
        </section>

        <footer className="mt-5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
          <span>Scuba Simulator · Private</span>
          <span>139373122825390</span>
        </footer>
      </div>
    </main>
  )
}
