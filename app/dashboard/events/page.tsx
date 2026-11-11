import type { Metadata } from "next"
import { EventsManager } from "@/components/dashboard/events-manager"

export const metadata: Metadata = {
  title: "Live events | Scuba Ops",
  description: "Manage live Scuba Simulator events, sightings, featured finds, and random rotation.",
}

export default function EventsPage() {
  return <EventsManager />
}
