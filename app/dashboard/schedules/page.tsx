import type { Metadata } from "next"
import { ScheduleManager } from "@/components/dashboard/schedule-manager"

export const metadata: Metadata = {
  title: "Event schedule | Scuba Ops",
  description: "Plan one-time, daily, and weekly Scuba Simulator events.",
}

export default function SchedulesPage() {
  return <ScheduleManager />
}
