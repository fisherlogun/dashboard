import { Suspense } from "react"
import type { Metadata } from "next"
import { PlayersWorkspace } from "@/components/dashboard/players-workspace"

export const metadata: Metadata = {
  title: "Players | Scuba Ops",
  description: "Manage online players, saved profiles, grants, and moderation from one workspace.",
}

export default async function PlayersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const initialTab = tab === "profiles" || tab === "bans" ? tab : "online"
  return <Suspense fallback={<div className="h-64 border border-border bg-card" />}><PlayersWorkspace initialTab={initialTab} /></Suspense>
}
