import { redirect } from "next/navigation"

export default async function ProfilesPage({ searchParams }: { searchParams: Promise<{ userId?: string }> }) {
  const { userId } = await searchParams
  const query = new URLSearchParams({ tab: "profiles" })
  if (userId) query.set("userId", userId)
  redirect(`/dashboard/players?${query.toString()}`)
}
