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

    if (!["kick", "warn", "message"].includes(action)) return NextResponse.json({ error: "Invalid player action" }, { status: 400 })
    if (!/^\d{1,20}$/.test(String(targetUserId))) return NextResponse.json({ error: "A valid numeric user ID is required" }, { status: 400 })
    if (typeof reason === "string" && reason.length > 500) return NextResponse.json({ error: "Reason is too long" }, { status: 400 })
    if (typeof message === "string" && message.length > 200) return NextResponse.json({ error: "Message must be at most 200 characters" }, { status: 400 })

    const commandMessage = action === "kick" || action === "warn" ? String(reason || message || "") : String(message || "")
    const command = {
      type: action,
      userId: String(targetUserId),
      displayName: typeof targetName === "string" ? targetName.slice(0, 80) : "Unknown",
      message: commandMessage,
      duration: duration || "permanent",
      issuedBy: session.displayName,
      issuedAt: new Date().toISOString(),
    }
    const payload = JSON.stringify(command)

    await publishMessage(project.universe_id, "DashboardCommands", payload, project.api_key)

    const ip = req.headers.get("x-forwarded-for") || "unknown"
    await addActionLog(
      projectId,
      session.userId,
      session.displayName,
      `player:${action}`,
      JSON.stringify({ who: session.displayName, what: action, target: String(targetUserId), payload: command }),
      ip,
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Player action error:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
