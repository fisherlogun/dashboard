import type { Metadata } from "next"
import { EventsHub } from "@/components/dashboard/events-hub"

export const metadata: Metadata = {
  title: "Events | Scuba Ops",
  description: "Plan recurring events and control live Scuba Simulator activity from one calendar.",
}

export default function EventsPage() {
  return <EventsHub />
}
