import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { isSetupComplete } from "@/lib/db"

export default async function Home() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  if (!isSetupComplete() && session.role === "owner") {
    redirect("/setup")
  }

  redirect("/dashboard")
}
