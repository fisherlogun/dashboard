"use client"

import { useSession } from "@/components/session-provider"
import { Button } from "@/components/ui/button"
import { Shield, Terminal, Activity, Gamepad2, Cpu } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, Suspense } from "react"

function LoginContent() {
  const { user, loading } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  useEffect(() => {
    if (!loading && user) router.push("/dashboard")
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between border-r border-border bg-card p-10">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          <span className="text-sm font-mono font-bold tracking-wider text-foreground uppercase">Nexus Control</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-3xl font-mono font-bold tracking-tight text-foreground">
            {'Server Management'}
            <br />
            <span className="text-primary">{'Redefined.'}</span>
          </h1>
          <p className="text-sm text-muted-foreground font-mono leading-relaxed max-w-md">
            Monitor servers, manage players, execute commands, and control your entire Roblox infrastructure from one panel.
          </p>

          <div className="grid grid-cols-2 gap-2 max-w-sm">
            {[
              { icon: Gamepad2, label: "Live Servers", color: "text-primary" },
              { icon: Terminal, label: "Remote CMD", color: "text-chart-2" },
              { icon: Shield, label: "Ban System", color: "text-chart-4" },
              { icon: Activity, label: "Audit Logs", color: "text-chart-3" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5 border border-border bg-background/50 p-2.5">
                <item.icon className={`h-3.5 w-3.5 ${item.color} shrink-0`} />
                <span className="text-xs font-mono text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground font-mono">NEXUS v3.0 // CONTROL PANEL</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex items-center gap-2 lg:hidden">
            <Cpu className="h-5 w-5 text-primary" />
            <span className="text-sm font-mono font-bold tracking-wider text-foreground uppercase">Nexus</span>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-mono font-bold text-foreground">AUTHENTICATE</h2>
            <p className="text-xs font-mono text-muted-foreground">Sign in with Roblox to access control panel</p>
          </div>

          {error && (
            <div className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-mono text-destructive">
              AUTH_FAILED: Authentication rejected. Retry.
            </div>
          )}

          <Button
            className="w-full gap-2 h-11 font-mono text-xs tracking-wider uppercase"
            onClick={() => { window.location.href = "/api/auth/login" }}
          >
            <Gamepad2 className="h-4 w-4" />
            Sign in with Roblox
          </Button>

          <p className="text-center text-[10px] font-mono text-muted-foreground leading-relaxed">
            REDIRECT TO ROBLOX OAUTH // ENCRYPTED SESSION
          </p>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-mono text-muted-foreground tracking-widest">SYS_INFO</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2.5 text-xs font-mono">
              <Shield className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-foreground">License Required</p>
                <p className="text-muted-foreground text-[10px]">Active license needed to access panel</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-xs font-mono">
              <Activity className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-foreground">Role-Based Access</p>
                <p className="text-muted-foreground text-[10px]">Permissions assigned per project role</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin border-2 border-primary border-t-transparent" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
