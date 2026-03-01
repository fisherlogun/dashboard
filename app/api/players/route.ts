import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getLivePlayers, getProject, getMemberRole, addActionLog, isGlobalAdmin } from "@/lib/db"
import { publishMessage } from "@/lib/roblox"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get("projectId")
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })

  try {
    const players = await getLivePlayers(projectId)
    return NextResponse.json({ players })
  } catch (error) {
    console.error("Players error:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

// POST: execute player actions (kick, ban, warn, message)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { projectId, action, targetUserId, targetName, reason, message, duration } = body
    if (!projectId || !action || !targetUserId) {
      return NextResponse.json({ error: "projectId, action, targetUserId required" }, { status: 400 })
    }

    const role = await getMemberRole(projectId, session.userId)
    if (!role && !isGlobalAdmin(session.userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const project = await getProject(projectId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const payload = JSON.stringify({
      type: action,
      userId: String(targetUserId),
      displayName: targetName || "Unknown",
      reason: reason || "",
      message: message || "",
      duration: duration || "permanent",
      issuedBy: session.displayName,
      issuedAt: new Date().toISOString(),
    })

    await publishMessage(project.universe_id, "DashboardCommands", payload, project.api_key)

    const ip = req.headers.get("x-forwarded-for") || "unknown"
    await addActionLog({
      projectId,
      userId: session.userId,
      userName: session.displayName,
      action: `player:${action}`,
      details: `${action} ${targetName || targetUserId}${reason ? ` - ${reason}` : ""}`,
      ip,
      status: "success",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Player action error:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
