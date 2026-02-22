import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { hasPermission } from "@/lib/roles"
import { getBansCollection } from "@/lib/mongodb"
import { addActionLog } from "@/lib/db"
import type { Role } from "@/lib/roles"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const collection = await getBansCollection()
    const bans = await collection.find({}).sort({ createdAt: -1 }).toArray()

    return NextResponse.json({
      bans: bans.map((b) => ({
        ...b,
        _id: b._id.toString(),
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
    const { robloxUserId, robloxDisplayName, reason, duration } = body

    if (!robloxUserId || !reason || !duration) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Calculate expiration
    let expiresAt: Date | null = null
    if (duration !== "permanent") {
      const units: Record<string, number> = {
        "1h": 3600000,
        "6h": 21600000,
        "12h": 43200000,
        "1d": 86400000,
        "3d": 259200000,
        "7d": 604800000,
        "30d": 2592000000,
      }
      const ms = units[duration]
      if (ms) {
        expiresAt = new Date(Date.now() + ms)
      }
    }

    const collection = await getBansCollection()
    await collection.updateOne(
      { robloxUserId: String(robloxUserId) },
      {
        $set: {
          robloxUserId: String(robloxUserId),
          robloxDisplayName: robloxDisplayName || "Unknown",
          bannedBy: session.userId,
          bannedByName: session.displayName,
          reason,
          duration,
          expiresAt,
          createdAt: new Date(),
          active: true,
        },
      },
      { upsert: true }
    )

    addActionLog({
      userId: session.userId,
      userName: session.displayName,
      action: "ban",
      details: `Banned ${robloxDisplayName || robloxUserId} for ${duration}: ${reason}`,
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

    const collection = await getBansCollection()
    await collection.updateOne(
      { robloxUserId },
      { $set: { active: false } }
    )

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
