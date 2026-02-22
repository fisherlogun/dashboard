"use client"

import { useSession } from "@/components/session-provider"
import { Button } from "@/components/ui/button"
import { Monitor, Shield, Terminal, Activity, Gamepad2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, Suspense } from "react"

function LoginContent() {
  const { user, loading } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between border-r border-border bg-card p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
            <Gamepad2 className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-card-foreground">Nexus</span>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-card-foreground text-balance">
              Server Management,<br />Redefined.
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-md text-pretty">
              Monitor servers, manage players, execute commands, and control your entire Roblox game infrastructure from one dashboard.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-sm">
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 p-3">
              <Monitor className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm text-card-foreground">Live Monitoring</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 p-3">
              <Terminal className="h-4 w-4 text-chart-2 shrink-0" />
              <span className="text-sm text-card-foreground">Remote Commands</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 p-3">
              <Shield className="h-4 w-4 text-chart-4 shrink-0" />
              <span className="text-sm text-card-foreground">Ban Management</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 p-3">
              <Activity className="h-4 w-4 text-success shrink-0" />
              <span className="text-sm text-card-foreground">Activity Logs</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Nexus Dashboard v2.0
        </p>
      </div>

      {/* Right Panel - Auth */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
              <Gamepad2 className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">Nexus</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in with your Roblox account to access the dashboard.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
              Authentication failed. Please try again.
            </div>
          )}

          <div className="space-y-4">
            <Button
              className="w-full gap-2.5 h-11"
              size="lg"
              onClick={() => {
                window.location.href = "/api/auth/login"
              }}
            >
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.5 2L14.5 22L9.5 22L14.5 2L9.5 2Z" fill="currentColor" />
              </svg>
              Sign in with Roblox
            </Button>

            <p className="text-center text-xs text-muted-foreground leading-relaxed">
              You will be redirected to Roblox to authorize this application.
              Your account data is encrypted and secure.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Info</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 text-sm">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10">
                <Shield className="h-3 w-3 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">License Required</p>
                <p className="text-xs text-muted-foreground">You need an active license to access this dashboard.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10">
                <Activity className="h-3 w-3 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Role-Based Access</p>
                <p className="text-xs text-muted-foreground">Permissions are assigned based on your dashboard role.</p>
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
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
