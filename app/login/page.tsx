"use client"

import { useSession } from "@/components/session-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Gamepad2, Shield, BarChart3, Terminal } from "lucide-react"
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Gamepad2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
            Roblox Dashboard
          </h1>
          <p className="text-sm text-muted-foreground text-pretty">
            Manage your Roblox experience with real-time stats, in-game commands, and admin controls.
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="text-lg text-card-foreground">Sign in to continue</CardTitle>
            <CardDescription>
              Authenticate with your Roblox account to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive-foreground">
                Authentication failed. Please try again.
              </div>
            )}

            <Button
              className="w-full gap-2"
              size="lg"
              onClick={() => {
                window.location.href = "/api/auth/login"
              }}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.5 2L14.5 22L9.5 22L14.5 2L9.5 2Z" fill="currentColor" />
              </svg>
              Sign in with Roblox
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              You will be redirected to Roblox to authorize this application.
            </p>
          </CardContent>
        </Card>

        {/* Feature Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border/50 bg-card p-3 text-center">
            <BarChart3 className="h-4 w-4 text-chart-1" />
            <span className="text-xs font-medium text-card-foreground">Live Stats</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border/50 bg-card p-3 text-center">
            <Terminal className="h-4 w-4 text-chart-2" />
            <span className="text-xs font-medium text-card-foreground">Commands</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border/50 bg-card p-3 text-center">
            <Shield className="h-4 w-4 text-chart-4" />
            <span className="text-xs font-medium text-card-foreground">Admin</span>
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
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
