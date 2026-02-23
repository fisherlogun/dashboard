import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getBans, createBan, unbanUser, getProject, getMemberRole, addActionLog, isGlobalAdmin } from "@/lib/db"
import { publishMessage } from "@/lib/roblox"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get("projectId")
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })

  try {
    const bans = await getBans(projectId)
    return NextResponse.json({ bans })
  } catch (error) {
    console.error("Bans fetch error:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { projectId, robloxUserId, reason, privateReason, duration } = body
    if (!projectId || !robloxUserId || !reason || !duration) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const role = await getMemberRole(projectId, session.userId)
    if (!role && !isGlobalAdmin(session.userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const project = await getProject(projectId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    // Calculate expiration
    let expiresAt: Date | null = null
    let durationSeconds: number | null = null
    if (duration !== "permanent") {
      const units: Record<string, number> = {
        "1h": 3600, "6h": 21600, "12h": 43200, "1d": 86400,
        "3d": 259200, "7d": 604800, "30d": 2592000,
      }
      durationSeconds = units[duration] ?? null
      if (durationSeconds) expiresAt = new Date(Date.now() + durationSeconds * 1000)
    }

    // Send to game via MessagingService
    try {
      const payload = JSON.stringify({
        type: "ban",
        userId: String(robloxUserId),
        reason,
        privateReason: privateReason || reason,
        duration,
        durationSeconds,
        expiresAt: expiresAt?.toISOString() ?? null,
        issuedBy: session.displayName,
        issuedAt: new Date().toISOString(),
      })
      await publishMessage(project.universe_id, "DashboardCommands", payload, project.api_key)
    } catch (err) {
      console.error("MessagingService ban error:", err)
    }

    await createBan({
      projectId,
      robloxUserId: String(robloxUserId),
      bannedBy: session.userId,
      bannedByName: session.displayName,
      reason,
      privateReason: privateReason || "",
      duration,
      durationSeconds,
      expiresAt,
    })

    const ip = req.headers.get("x-forwarded-for") || "unknown"
    await addActionLog({ projectId, userId: session.userId, userName: session.displayName, action: "ban", details: `Banned ${robloxUserId}: ${reason}`, ip, status: "success" })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Ban error:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const banId = searchParams.get("banId")
    const projectId = searchParams.get("projectId")
    const robloxUserId = searchParams.get("userId")
    if (!banId || !projectId) return NextResponse.json({ error: "banId and projectId required" }, { status: 400 })

    const role = await getMemberRole(projectId, session.userId)
    if (!role && !isGlobalAdmin(session.userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const project = await getProject(projectId)
    if (project && robloxUserId) {
      try {
        const payload = JSON.stringify({ type: "unban", userId: robloxUserId, issuedBy: session.displayName, issuedAt: new Date().toISOString() })
        await publishMessage(project.universe_id, "DashboardCommands", payload, project.api_key)
      } catch (err) {
        console.error("MessagingService unban error:", err)
      }
    }

    await unbanUser(banId)

    const ip = req.headers.get("x-forwarded-for") || "unknown"
    await addActionLog({ projectId, userId: session.userId, userName: session.displayName, action: "unban", details: `Unbanned ${robloxUserId || banId}`, ip, status: "success" })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unban error:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
