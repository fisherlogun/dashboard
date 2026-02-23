import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { hasPermission } from "@/lib/roles"
import { addActionLog, getConfig, addBan, getBans, unbanUser } from "@/lib/db"
import { publishMessage } from "@/lib/roblox"
import type { Role } from "@/lib/roles"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const bans = getBans()

    return NextResponse.json({
      bans: bans.map((b) => ({
        _id: b.id,
        robloxUserId: b.robloxUserId,
        bannedBy: b.bannedBy,
        bannedByName: b.bannedByName,
        reason: b.reason,
        privateReason: b.privateReason,
        duration: b.duration,
        expiresAt: b.expiresAt?.toISOString() ?? null,
        createdAt: b.createdAt.toISOString(),
        active: b.active,
      })),
    })
  } catch (error) {
    console.error("Bans fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch bans" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!hasPermission(session.role as Role, "execute_ban")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const body = await req.json()
    const { robloxUserId, reason, privateReason, duration, expiresAt: expiresAtStr } = body

    if (!robloxUserId || !reason || !duration) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const config = getConfig()

    // Calculate expiration
    let expiresAt: Date | null = null
    let durationSeconds: number | null = null

    if (duration === "custom" && expiresAtStr) {
      expiresAt = new Date(expiresAtStr)
      durationSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
    } else if (duration !== "permanent") {
      const units: Record<string, number> = {
        "1h": 3600,
        "6h": 21600,
        "12h": 43200,
        "1d": 86400,
        "3d": 259200,
        "7d": 604800,
        "30d": 2592000,
      }
      durationSeconds = units[duration] ?? null
      if (durationSeconds) {
        expiresAt = new Date(Date.now() + durationSeconds * 1000)
      }
    }

    // Send ban command to the game via MessagingService
    if (config) {
      try {
        const banPayload = JSON.stringify({
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
        await publishMessage(
          config.universeId,
          "DashboardCommands",
          banPayload,
          config.apiKey
        )
      } catch (err) {
        console.error("MessagingService ban error:", err)
      }
    }

    addBan({
      robloxUserId: String(robloxUserId),
      bannedBy: session.userId,
      bannedByName: session.displayName,
      reason,
      privateReason: privateReason || "",
      duration,
      durationSeconds,
      expiresAt,
      createdAt: new Date(),
      active: true,
    })

    addActionLog({
      userId: session.userId,
      userName: session.displayName,
      action: "ban",
      details: `Banned ${robloxUserId} for ${duration}: ${reason}`,
      ip: "",
      status: "success",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Ban error:", error)
    return NextResponse.json({ error: "Failed to create ban" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!hasPermission(session.role as Role, "manage_bans")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const robloxUserId = searchParams.get("userId")
    if (!robloxUserId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }

    const config = getConfig()

    // Send unban command to the game via MessagingService
    if (config) {
      try {
        const unbanPayload = JSON.stringify({
          type: "unban",
          userId: robloxUserId,
          issuedBy: session.displayName,
          issuedAt: new Date().toISOString(),
        })
        await publishMessage(
          config.universeId,
          "DashboardCommands",
          unbanPayload,
          config.apiKey
        )
      } catch (err) {
        console.error("MessagingService unban error:", err)
      }
    }

    unbanUser(robloxUserId)

    addActionLog({
      userId: session.userId,
      userName: session.displayName,
      action: "unban",
      details: `Unbanned user ${robloxUserId}`,
      ip: "",
      status: "success",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unban error:", error)
    return NextResponse.json({ error: "Failed to unban" }, { status: 500 })
  }
}
