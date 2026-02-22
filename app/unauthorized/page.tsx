import Link from "next/link"
import { ShieldX } from "lucide-react"

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card">
          <ShieldX className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Access Denied
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your account is not licensed to use this dashboard. Contact the
            administrator to request access.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Back to Login
        </Link>
      </div>
    </div>
  )
}
