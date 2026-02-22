"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Loader2, AlertCircle, Key, Globe, Gamepad2, ArrowRight, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { useSession } from "@/components/session-provider"

const STEPS = [
  { title: "API Key", description: "Enter your Roblox Open Cloud API key", icon: Key },
  { title: "Experience", description: "Configure your Universe and Place IDs", icon: Globe },
  { title: "Confirm", description: "Review and complete setup", icon: CheckCircle2 },
]

export default function SetupPage() {
  const router = useRouter()
  const { user, refresh } = useSession()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [validated, setValidated] = useState(false)
  const [gameName, setGameName] = useState("")

  const [apiKey, setApiKey] = useState("")
  const [universeId, setUniverseId] = useState("")
  const [placeId, setPlaceId] = useState("")

  async function handleValidate() {
    if (!apiKey || !universeId) {
      toast.error("Please fill in all fields")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/setup/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, universeId }),
      })
      const data = await res.json()
      if (data.valid) {
        setValidated(true)
        setGameName(data.gameName)
        toast.success(`Validated: ${data.gameName}`)
        setStep(2)
      } else {
        toast.error(data.error || "Validation failed")
      }
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setLoading(true)
    try {
      const res = await fetch("/api/setup/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, universeId, placeId, gameName }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Setup complete!")
        await refresh()
        router.push("/dashboard")
      } else {
        toast.error(data.error || "Save failed")
      }
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Gamepad2 className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Initial Setup
          </h1>
          <p className="text-sm text-muted-foreground">
            {user && `Welcome, ${user.displayName}. `}Configure your Roblox experience to get started.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px w-8 transition-colors ${
                    i < step ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              {(() => {
                const Icon = STEPS[step].icon
                return <Icon className="h-5 w-5 text-primary" />
              })()}
              <CardTitle className="text-lg text-card-foreground">{STEPS[step].title}</CardTitle>
            </div>
            <CardDescription>{STEPS[step].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="apiKey" className="text-foreground">Open Cloud API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Enter your API key..."
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value)
                      setValidated(false)
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Create an API key at{" "}
                    <a
                      href="https://create.roblox.com/dashboard/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      Roblox Creator Dashboard
                    </a>
                    . Ensure it has MessagingService publish permissions.
                  </p>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="universeId" className="text-foreground">Universe ID</Label>
                  <Input
                    id="universeId"
                    placeholder="e.g. 123456789"
                    value={universeId}
                    onChange={(e) => {
                      setUniverseId(e.target.value)
                      setValidated(false)
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="placeId" className="text-foreground">Place ID</Label>
                  <Input
                    id="placeId"
                    placeholder="e.g. 987654321"
                    value={placeId}
                    onChange={(e) => setPlaceId(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Find these in your experience settings on the Creator Dashboard.
                </p>
              </>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Experience</span>
                    <Badge variant="secondary" className="text-secondary-foreground">{gameName || "Pending validation"}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Universe ID</span>
                    <span className="text-sm font-mono text-foreground">{universeId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Place ID</span>
                    <span className="text-sm font-mono text-foreground">{placeId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">API Key</span>
                    <span className="text-sm font-mono text-foreground">
                      {"*".repeat(20)}{apiKey.slice(-4)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    {validated ? (
                      <Badge className="bg-success text-success-foreground gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Validated
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-warning">
                        <AlertCircle className="h-3 w-3" /> Not validated
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>

            {step === 0 && (
              <Button onClick={() => setStep(1)} disabled={!apiKey}>
                Next
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}

            {step === 1 && (
              <Button
                onClick={handleValidate}
                disabled={loading || !universeId || !placeId}
              >
                {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Validate & Continue
              </Button>
            )}

            {step === 2 && (
              <Button
                onClick={handleSave}
                disabled={loading || !validated}
              >
                {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Complete Setup
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
