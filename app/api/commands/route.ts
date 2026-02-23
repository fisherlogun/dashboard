import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getProjectById, getProjectMember, addActionLog } from "@/lib/db"
import { publishMessage } from "@/lib/roblox"
import { hasPermission } from "@/lib/roles"

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { projectId, type, userId, reason, message, serverId, privateReason, duration, durationSeconds, expiresAt } = body

    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })

    const project = await getProjectById(projectId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const member = await getProjectMember(projectId, session.userId)
    if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 })

    const role = member.role as "owner" | "admin" | "moderator"

    if (type === "kick" && !hasPermission(role, "execute_kick")) {
      return NextResponse.json({ error: "No permission to kick" }, { status: 403 })
    }
    if (type === "ban" && !hasPermission(role, "execute_ban")) {
      return NextResponse.json({ error: "No permission to ban" }, { status: 403 })
    }
    if (type === "warn" && !hasPermission(role, "execute_warn")) {
      return NextResponse.json({ error: "No permission to warn" }, { status: 403 })
    }
    if (type === "announce" && !hasPermission(role, "execute_announce")) {
      return NextResponse.json({ error: "No permission to announce" }, { status: 403 })
    }

    const payload: Record<string, unknown> = {
      type,
      issuedBy: session.displayName,
      issuedAt: new Date().toISOString(),
    }

    if (type === "kick") {
      payload.userId = userId
      payload.reason = reason || "No reason provided"
    } else if (type === "ban") {
      payload.userId = userId
      payload.reason = reason || "No reason provided"
      payload.privateReason = privateReason || reason || ""
      payload.duration = duration
      payload.durationSeconds = durationSeconds ?? null
      payload.expiresAt = expiresAt ?? null
    } else if (type === "warn") {
      payload.userId = userId
      payload.reason = reason
    } else if (type === "announce") {
      payload.message = message
      if (serverId) payload.serverId = serverId
    } else {
      return NextResponse.json({ error: "Invalid command type" }, { status: 400 })
    }

    await publishMessage(project.universe_id, "DashboardCommands", JSON.stringify(payload), project.api_key)

    const details = type === "kick" ? `Kicked ${userId}: ${reason}`
      : type === "ban" ? `Banned ${userId} (${duration}): ${reason}`
      : type === "warn" ? `Warned ${userId}: ${reason}`
      : `Announce: ${message}`

    await addActionLog(projectId, session.userId, session.displayName, type, details)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Command error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Command failed" }, { status: 500 })
  }
}
