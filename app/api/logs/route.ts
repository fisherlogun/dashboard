import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getProjectMember, getActionLogs } from "@/lib/db"
import { hasPermission } from "@/lib/roles"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const projectId = req.nextUrl.searchParams.get("projectId")
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })

    const member = await getProjectMember(projectId, session.userId)
    if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 })

    const role = member.role as "owner" | "admin" | "moderator"
    const canViewAll = hasPermission(role, "view_logs")

    const logs = await getActionLogs(projectId, canViewAll ? undefined : session.userId)

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("Logs error:", error)
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
  }
}
