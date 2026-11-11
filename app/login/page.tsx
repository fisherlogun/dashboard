"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
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
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-3 py-4 text-foreground sm:px-6 sm:py-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(88,183,170,.16),transparent_48%)]" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col">
        <div className="grid overflow-hidden border border-border/80 bg-card/90 shadow-[0_35px_100px_rgba(0,0,0,.45)] md:min-h-[620px] md:grid-cols-[1.04fr_.96fr]">
          <section className="relative isolate flex min-h-[260px] flex-col justify-between overflow-hidden border-b border-border/70 p-5 sm:p-8 md:min-h-[620px] md:border-b-0 md:border-r md:p-10">
            <Image src="/scuba-console-art.png" alt="" aria-hidden="true" fill priority sizes="(max-width: 768px) 100vw, 52vw" className="object-cover object-center opacity-75" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#071114]/45 via-[#071114]/20 to-[#071114]/95" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#071114]/45 via-transparent to-[#071114]/20" />
            <header className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center border border-primary/40 bg-black/25 text-primary backdrop-blur-sm">
                  <Waves aria-hidden="true" className="size-5" />
                </div>
                <div>
                  <p className="font-mono text-xs font-semibold tracking-[0.2em] text-white">SCUBA SIMULATOR</p>
                  <p className="mt-1 font-mono text-[10px] tracking-[0.16em] text-white/60">PRIVATE OPERATIONS</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 border border-white/20 bg-black/25 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white/80 backdrop-blur-sm">
                <LockKeyhole aria-hidden="true" className="size-3 text-primary" /> Owner only
              </span>
            </header>
            <div className="relative mt-10 max-w-lg">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-primary">The world below, in your hands</p>
              <h1 className="max-w-md text-3xl font-semibold leading-[1.08] tracking-[-0.045em] text-white sm:text-4xl md:text-5xl">Go beneath.<br />Stay in control.</h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/70">A private command deck for the people who keep Scuba Simulator moving.</p>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/15 pt-5 font-mono text-[10px] uppercase tracking-[0.15em] text-white/60">
                <span className="inline-flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#7fe0b6]" /> Owner verified access</span>
                <span>Universe 139373122825390</span>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center bg-card/90 px-5 py-8 sm:px-9 md:px-10 lg:px-12">
            <div className="w-full max-w-md">
              <div className="mb-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Secure access</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Sign in to your console</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Use the configured Roblox owner ID and your private password to continue.</p>
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
                    className="h-12 font-mono"
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
                    className="h-12 font-mono"
                  />
                  {error && <p id="login-error" role="alert" className="text-sm text-destructive">{error}</p>}
                </div>
                <Button type="submit" disabled={busy || ownerId.length === 0 || password.length === 0} className="h-12 w-full">
                  {busy ? "Verifying access…" : "Enter private console"}
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Button>
              </form>

              <div className="mt-7 border-t border-border/70 pt-5">
                <div className="flex items-start gap-3 text-xs leading-5 text-muted-foreground">
                  <LockKeyhole aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <p>Private access checks the owner ID allowlist and password, then issues a short-lived encrypted session.</p>
                </div>
              </div>
              <footer className="mt-8 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                <span>Scuba Simulator · Private</span>
                <span>Owner console</span>
              </footer>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
