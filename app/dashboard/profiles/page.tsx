import { Suspense } from "react"
import type { Metadata } from "next"
import { PlayerProfileManager } from "@/components/dashboard/player-profile-manager"

export const metadata: Metadata = {
  title: "Player profiles | Scuba Ops",
  description: "Search, review and safely manage online and offline Scuba Simulator player profiles.",
}

export default function ProfilesPage() {
  return <Suspense fallback={<div className="h-64 rounded-xl border border-border/60 bg-muted/30" />}><PlayerProfileManager /></Suspense>
}
