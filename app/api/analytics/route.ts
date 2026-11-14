import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getMemberRole, getPlayerAnalytics, isGlobalAdmin } from "@/lib/db"

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const projectId = request.nextUrl.searchParams.get("projectId")
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })

  try {
    const role = await getMemberRole(projectId, session.userId)
    if (!role && !isGlobalAdmin(session.userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const days = Number(request.nextUrl.searchParams.get("days") ?? 30)
    const analytics = await getPlayerAnalytics(projectId, Number.isFinite(days) ? days : 30)
    return NextResponse.json(analytics)
  } catch (error) {
    console.error("Player analytics error:", error)
    return NextResponse.json({ error: "Unable to load player analytics" }, { status: 500 })
  }
}
