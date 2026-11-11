import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getProjectById, getProjectMember, addActionLog } from "@/lib/db"
import { publishMessage } from "@/lib/roblox"
import { hasPermission } from "@/lib/roles"
import { z } from "zod"

const commandSchema = z.object({
  projectId: z.string().min(1).max(64),
  type: z.enum(["kick", "ban", "warn", "announce"]),
  userId: z.union([z.string(), z.number()]).optional(),
  reason: z.string().max(500).optional(),
  privateReason: z.string().max(500).optional(),
  message: z.string().max(200).optional(),
  title: z.string().max(60).optional(),
  style: z.enum(["announcement", "update", "event", "warning", "maintenance"]).optional(),
  duration: z.union([z.string().max(16), z.number().int().min(5).max(30)]).optional(),
  durationSeconds: z.number().int().min(0).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  serverId: z.string().max(128).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const parsed = commandSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid command" }, { status: 400 })
    const { projectId, type, userId, reason, message, serverId, privateReason, duration, durationSeconds, expiresAt, title, style } = parsed.data
    if ((type === "kick" || type === "ban" || type === "warn") && !/^\d{1,20}$/.test(String(userId ?? ""))) return NextResponse.json({ error: "A valid numeric user ID is required" }, { status: 400 })
    if ((type === "kick" || type === "ban" || type === "warn") && !reason?.trim()) return NextResponse.json({ error: "A reason is required" }, { status: 400 })
    if (type === "announce" && !message?.trim()) return NextResponse.json({ error: "An announcement message is required" }, { status: 400 })

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
      payload.userId = String(userId)
      payload.message = reason?.trim() || "No reason provided"
    } else if (type === "ban") {
      payload.userId = String(userId)
      payload.message = reason?.trim() || "No reason provided"
      payload.privateReason = privateReason?.trim() || reason?.trim() || ""
      payload.duration = typeof duration === "string" ? duration : "permanent"
      payload.durationSeconds = durationSeconds ?? null
      payload.expiresAt = expiresAt ?? null
    } else if (type === "warn") {
      payload.userId = String(userId)
      payload.message = reason?.trim()
      if (serverId) payload.serverId = serverId
    } else if (type === "announce") {
      payload.message = message?.trim()
      payload.title = title?.trim().slice(0, 60) || ""
      payload.style = style ?? "announcement"
      payload.duration = typeof duration === "number" ? duration : undefined
      if (serverId) payload.serverId = serverId
    } else {
      return NextResponse.json({ error: "Invalid command type" }, { status: 400 })
    }

    await publishMessage(project.universe_id, "DashboardCommands", JSON.stringify(payload), project.api_key)

    const target = type === "announce" ? (serverId ? `server:${serverId}` : "all servers") : String(userId)
    await addActionLog(projectId, session.userId, session.displayName, type, JSON.stringify({ who: session.displayName, what: type, target, payload }))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Command error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Command failed" }, { status: 500 })
  }
}
