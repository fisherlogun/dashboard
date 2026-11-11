import { NextRequest, NextResponse } from "next/server"
import { getProject, getBans } from "@/lib/db"
import { verifyProjectRelayKey } from "@/lib/relay-auth"

export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key")
    if (!apiKey) return NextResponse.json({ error: "Missing x-api-key" }, { status: 401 })

    const projectId = req.nextUrl.searchParams.get("projectId")
    const userId = req.nextUrl.searchParams.get("userId")
    if (!projectId || !userId) return NextResponse.json({ error: "projectId and userId required" }, { status: 400 })

    const project = await getProject(projectId)
    if (!project || !verifyProjectRelayKey(projectId, apiKey)) return NextResponse.json({ error: "Invalid relay key" }, { status: 403 })

    const bans = await getBans(projectId)
    const activeBan = bans.find((b) => {
      if (b.roblox_user_id !== userId || !b.active) return false
      if (b.expires_at && new Date(b.expires_at) < new Date()) return false
      return true
    })

    if (activeBan) {
      return NextResponse.json({
        banned: true,
        reason: activeBan.reason,
        duration: activeBan.duration,
        expiresAt: activeBan.expires_at,
      })
    }

    // Check if user was previously banned but is now unbanned
    const inactiveBan = bans.find((b) => b.roblox_user_id === userId && !b.active)

    return NextResponse.json({ banned: false, wasUnbanned: !!inactiveBan })
  } catch (error) {
    console.error("Check-ban error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
