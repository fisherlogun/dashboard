import { NextRequest, NextResponse } from "next/server"
import { getProject, removeLivePlayer } from "@/lib/db"
import { verifyProjectRelayKey } from "@/lib/relay-auth"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const projectId = typeof body.projectId === "string" ? body.projectId : ""
    const serverId = typeof body.serverId === "string" ? body.serverId : ""
    const userId = String(body.userId ?? "")

    if (!projectId || !serverId || !/^\d{1,20}$/.test(userId)) {
      return NextResponse.json({ error: "Invalid player leave payload" }, { status: 400 })
    }

    const project = await getProject(projectId)
    if (!project || !verifyProjectRelayKey(projectId, request.headers.get("x-api-key"))) {
      return NextResponse.json({ error: "Unauthorized relay" }, { status: 401 })
    }

    await removeLivePlayer(projectId, userId, serverId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Player leave relay error:", error)
    return NextResponse.json({ error: "Unable to record player leave" }, { status: 500 })
  }
}
