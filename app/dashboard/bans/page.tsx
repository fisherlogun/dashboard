import { redirect } from "next/navigation"

export default function BansPage() {
  redirect("/dashboard/players?tab=bans")
}
