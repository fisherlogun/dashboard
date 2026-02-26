import { NextRequest, NextResponse } from "next/server"
import { getProject, upsertLiveServer, upsertLivePlayer, addPlayerHistoryPoint, cleanupStaleServers } from "@/lib/db"

// This endpoint is called by the Roblox Lua script every 15 seconds.
// It is authenticated by matching the project's API key (sent as x-api-key header).
// No session cookie required -- this is server-to-server.

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key")
    if (!apiKey) return NextResponse.json({ error: "Missing x-api-key" }, { status: 401 })

    const body = await req.json()
    const { projectId, serverId, placeId, players, maxPlayers, fps, ping, uptime, playerList } = body

    if (!projectId || !serverId) {
      return NextResponse.json({ error: "projectId and serverId required" }, { status: 400 })
    }

    // Verify API key matches the project
    const project = await getProject(projectId)
    if (!project || project.api_key !== apiKey) {
      return NextResponse.json({ error: "Invalid API key for this project" }, { status: 403 })
    }

    // Upsert the server
    await upsertLiveServer({
      id: serverId,
      projectId,
      placeId: placeId || project.place_id,
      players: players ?? 0,
      maxPlayers: maxPlayers ?? 0,
      fps: fps ?? 60,
      ping: ping ?? 0,
      uptime: uptime ?? 0,
    })

    // Upsert each player
    if (Array.isArray(playerList)) {
      for (const p of playerList) {
        const avatarUrl = (await fetch(
          `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${p.userId}&size=150x150&format=Png&isCircular=false`
        ).then(r => r.json())).data?.[0]?.imageUrl ?? null

        await upsertLivePlayer({
          userId: String(p.userId),
          projectId,
          serverId,
          displayName: p.displayName || "Unknown",
          username: p.username || "Unknown",
          playTime: p.playTime ?? 0,
          accountAge: p.accountAge ?? 0,
          avatarUrl,
        })
      }
    }
    // Record a history point -- throttled to max 1 per 30s per project
    try {
      const q = (await import("@/lib/neon")).sql()
      const latest = await q`
        SELECT recorded_at FROM player_history
        WHERE project_id = ${projectId}
        ORDER BY recorded_at DESC LIMIT 1
      `
      const lastTime = latest[0]?.recorded_at ? new Date(latest[0].recorded_at).getTime() : 0
      if (Date.now() - lastTime > 30000) {
        await addPlayerHistoryPoint(projectId, players ?? 0, 1)
      }
    } catch {
      // Non-fatal
    }

    // Cleanup stale entries every heartbeat (cheap query)
    try {
      await cleanupStaleServers()
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Heartbeat error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
