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
    const { projectId, action, serverId, message, title, style, duration } = body
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })
    if (!["shutdown_server", "shutdown_all", "announce"].includes(action)) return NextResponse.json({ error: "Invalid server action" }, { status: 400 })
    if (action === "shutdown_server" && (typeof serverId !== "string" || serverId.length > 128)) return NextResponse.json({ error: "A valid server ID is required" }, { status: 400 })
    if (action === "announce" && (typeof message !== "string" || !message.trim() || message.length > 200)) return NextResponse.json({ error: "Announcement must be 1–200 characters" }, { status: 400 })
    if (action === "announce" && typeof title === "string" && title.length > 60) return NextResponse.json({ error: "Announcement title must be at most 60 characters" }, { status: 400 })
    if (action === "announce" && style !== undefined && !["announcement", "update", "event", "warning", "maintenance"].includes(style)) return NextResponse.json({ error: "Invalid announcement style" }, { status: 400 })
    if (action === "announce" && duration !== undefined && (!Number.isInteger(duration) || duration < 5 || duration > 30)) return NextResponse.json({ error: "Duration must be from 5 to 30 seconds" }, { status: 400 })

    const role = await getMemberRole(projectId, session.userId)
    if (!role && !isGlobalAdmin(session.userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const project = await getProject(projectId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const command = {
      type: action,
      ...(serverId ? { serverId } : {}),
      ...(typeof message === "string" ? { message: message.trim().slice(0, 200) } : {}),
      ...(action === "announce" ? {
        title: typeof title === "string" ? title.trim().slice(0, 60) : "",
        style: style ?? "announcement",
        duration: typeof duration === "number" ? duration : undefined,
      } : {}),
      issuedBy: session.displayName,
      issuedAt: new Date().toISOString(),
    }
    const payload = JSON.stringify(command)

    await publishMessage(project.universe_id, "DashboardCommands", payload, project.api_key)

    const ip = req.headers.get("x-forwarded-for") || "unknown"
    await addActionLog(
      projectId,
      session.userId,
      session.displayName,
      `server:${action}`,
      JSON.stringify({ who: session.displayName, what: action, target: serverId ?? "all servers", payload: command }),
      ip,
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Server action error:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
