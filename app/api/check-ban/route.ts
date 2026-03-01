import { NextRequest, NextResponse } from "next/server"
import { getProject, getBans } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key")
    if (!apiKey) return NextResponse.json({ error: "Missing x-api-key" }, { status: 401 })

    const projectId = req.nextUrl.searchParams.get("projectId")
    const userId = req.nextUrl.searchParams.get("userId")
    if (!projectId || !userId) return NextResponse.json({ error: "projectId and userId required" }, { status: 400 })

    const project = await getProject(projectId)
    if (!project || project.api_key !== apiKey) return NextResponse.json({ error: "Invalid" }, { status: 403 })

    const bans = await getBans(projectId)
    const activeBan = bans.find((b: { roblox_user_id: string; active: boolean; expires_at: string | null }) => {
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
    const inactiveBan = bans.find((b: { roblox_user_id: string; active: boolean }) => b.roblox_user_id === userId && !b.active)

    return NextResponse.json({ banned: false, wasUnbanned: !!inactiveBan })
  } catch (error) {
    console.error("Check-ban error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
