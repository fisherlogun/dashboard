import { NextRequest, NextResponse } from "next/server"
import { getProject, upsertLivePlayer, addActionLog } from "@/lib/db"
import { verifyProjectRelayKey } from "@/lib/relay-auth"
import { getUserThumbnail } from "@/lib/roblox"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const projectId = typeof body.projectId === "string" ? body.projectId : ""
    const serverId = typeof body.serverId === "string" ? body.serverId : ""
    const placeId = String(body.placeId ?? "")
    const userId = String(body.userId ?? "")
    const username = typeof body.username === "string" ? body.username.slice(0, 50) : "Unknown"
    const displayName = typeof body.displayName === "string" ? body.displayName.slice(0, 50) : username
    const accountAge = Number.isInteger(body.accountAge) ? Math.max(0, Math.min(body.accountAge, 36500)) : 0

    if (!projectId || !serverId || !/^\d{1,20}$/.test(userId)) {
      return NextResponse.json({ error: "Invalid player join payload" }, { status: 400 })
    }

    const project = await getProject(projectId)
    if (!project || !verifyProjectRelayKey(projectId, request.headers.get("x-api-key"))) {
      return NextResponse.json({ error: "Unauthorized relay" }, { status: 401 })
    }
    if (placeId !== String(project.place_id)) {
      return NextResponse.json({ error: "Place does not match this project" }, { status: 403 })
    }

    const avatarUrl = await getUserThumbnail(userId).catch(() => null)
    await upsertLivePlayer({
      userId,
      projectId,
      serverId,
      displayName: displayName || username,
      username,
      playTime: 0,
      accountAge,
      avatarUrl,
    })
    await addActionLog(
      projectId,
      userId,
      username,
      "join",
      JSON.stringify({ displayName: displayName || username, userId, avatarUrl }),
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Player join relay error:", error)
    return NextResponse.json({ error: "Unable to record player join" }, { status: 500 })
  }
}
