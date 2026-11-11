import { redirect } from "next/navigation"

export default function DatastoresPage() {
  redirect("/dashboard/players?tab=profiles")
}
