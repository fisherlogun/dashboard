import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getConfig, addActionLog } from "@/lib/db"
import { getServers, publishMessage } from "@/lib/roblox"
import { hasPermission } from "@/lib/roles"
import { rateLimit } from "@/lib/rate-limit"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { allowed } = rateLimit(`servers:${session.userId}`, 30, 60000)
    if (!allowed) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 })
    }

    const config = getConfig()
    if (!config) {
      return NextResponse.json(
        { error: "Setup not complete", setupRequired: true },
        { status: 400 }
      )
    }

    const serverData = await getServers(config.placeId)

    const servers = serverData.data.map(
      (s: { id: string; playing: number; maxPlayers: number; fps: number; ping: number; playerTokens: string[] }) => ({
        id: s.id,
        players: s.playing,
        maxPlayers: s.maxPlayers,
        fps: s.fps ?? 60,
        ping: s.ping ?? 0,
        playerTokens: s.playerTokens ?? [],
      })
    )

    return NextResponse.json({
      servers,
      total: servers.length,
    })
  } catch (error) {
    console.error("Servers error:", error)
    return NextResponse.json(
      { error: "Failed to fetch servers" },
      { status: 500 }
    )
  }
}

// POST /api/servers - shutdown a server
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!hasPermission(session.role, "manage_config")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const config = getConfig()
    if (!config) {
      return NextResponse.json({ error: "Setup not complete" }, { status: 400 })
    }

    const body = await request.json()
    const { serverId, action } = body

    if (action === "shutdown" && serverId) {
      const payload = JSON.stringify({
        type: "shutdown_server",
        serverId,
        issuedBy: session.displayName,
        issuedAt: new Date().toISOString(),
      })

      await publishMessage(
        config.universeId,
        "DashboardCommands",
        payload,
        config.apiKey
      )

      const ip = request.headers.get("x-forwarded-for") || "unknown"
      addActionLog({
        userId: session.userId,
        userName: session.displayName,
        action: "server:shutdown",
        details: `Shutdown server ${serverId}`,
        ip,
        status: "success",
      })

      return NextResponse.json({ success: true, message: "Shutdown command sent" })
    }

    if (action === "announce" && serverId) {
      const { message: announceMsg } = body
      if (!announceMsg || typeof announceMsg !== "string") {
        return NextResponse.json({ error: "Message is required" }, { status: 400 })
      }

      const payload = JSON.stringify({
        type: "announce",
        message: announceMsg,
        serverId,
        issuedBy: session.displayName,
        issuedAt: new Date().toISOString(),
      })

      await publishMessage(
        config.universeId,
        "DashboardCommands",
        payload,
        config.apiKey
      )

      const ip = request.headers.get("x-forwarded-for") || "unknown"
      addActionLog({
        userId: session.userId,
        userName: session.displayName,
        action: "server:announce",
        details: `Announced to server ${serverId}: ${announceMsg}`,
        ip,
        status: "success",
      })

      return NextResponse.json({ success: true, message: "Announcement sent to server" })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Server action error:", error)
    return NextResponse.json({ error: "Failed to execute action" }, { status: 500 })
  }
}
