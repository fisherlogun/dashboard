import { redirect } from "next/navigation"

export default function SchedulesPage() {
  redirect("/dashboard/events?tab=calendar")
}
