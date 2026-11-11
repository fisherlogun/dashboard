import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getLiveServers, getPlayersInServer, getProject, getMemberRole, addActionLog, isGlobalAdmin } from "@/lib/db"
import { publishMessage } from "@/lib/roblox"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get("projectId")
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })

  try {
    const servers = await getLiveServers(projectId)
    const serversWithPlayers = await Promise.all(
      servers.map(async (s: Record<string, unknown>) => {
        const players = await getPlayersInServer(projectId, s.id as string)
        return { ...s, playerList: players }
      })
    )
    return NextResponse.json({ servers: serversWithPlayers })
  } catch (error) {
    console.error("Servers error:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { projectId, action, serverId, message } = body
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })

    const role = await getMemberRole(projectId, session.userId)
    if (!role && !isGlobalAdmin(session.userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const project = await getProject(projectId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const payload = JSON.stringify({
      type: action,
      serverId: serverId || null,
      message: message || null,
      issuedBy: session.displayName,
      issuedAt: new Date().toISOString(),
    })

    await publishMessage(project.universe_id, "DashboardCommands", payload, project.api_key)

    const ip = req.headers.get("x-forwarded-for") || "unknown"
    await addActionLog(
      projectId,
      session.userId,
      session.displayName,
      `server:${action}`,
      `${action} ${serverId ? `server ${serverId}` : "all servers"}${message ? `: ${message}` : ""}`,
      ip,
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Server action error:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
