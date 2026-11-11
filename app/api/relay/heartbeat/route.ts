import { NextRequest, NextResponse } from "next/server"
import { getProject, getLivePlayers, upsertLiveServer, upsertLivePlayer, addPlayerHistoryPoint, cleanupStaleServers, addActionLog } from "@/lib/db"
import { verifyProjectRelayKey } from "@/lib/relay-auth"

// This server-to-server endpoint accepts the project-specific relay key, never the Roblox Open Cloud key.

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key")
    if (!apiKey) return NextResponse.json({ error: "Missing x-api-key" }, { status: 401 })

    const body = await req.json()
    const { projectId, serverId, placeId, players, maxPlayers, fps, ping, uptime, playerList } = body

    if (!projectId || !serverId) {
      return NextResponse.json({ error: "projectId and serverId required" }, { status: 400 })
    }

    const project = await getProject(projectId)
    if (!project || !verifyProjectRelayKey(projectId, apiKey)) {
      return NextResponse.json({ error: "Invalid relay key for this project" }, { status: 403 })
    }
    if (String(placeId ?? project.place_id) !== String(project.place_id)) {
      return NextResponse.json({ error: "Place does not match this project" }, { status: 403 })
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

    // PlayerAdded posts joins immediately; this path is a fallback for players already present on startup.
    if (Array.isArray(playerList)) {
      const existingPlayers: Array<Record<string, unknown>> = await getLivePlayers(projectId).catch(() => [])
      const knownUserIds = new Set(existingPlayers.map((player) => String(player.user_id)))

      for (const p of playerList.slice(0, 200)) {
        if (!p || typeof p !== "object" || p.userId == null) continue
        const userId = String(p.userId)
        const isNewToLiveSet = !knownUserIds.has(userId)
        let avatarUrl: string | null = null

        if (isNewToLiveSet) {
          try {
            const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${encodeURIComponent(userId)}&size=150x150&format=Png&isCircular=false`)
            if (thumbRes.ok) {
              const thumbData = await thumbRes.json()
              avatarUrl = thumbData.data?.[0]?.imageUrl ?? null
            }
          } catch { /* non-fatal */ }
        }

        await upsertLivePlayer({
          userId,
          projectId,
          serverId,
          displayName: typeof p.displayName === "string" ? p.displayName.slice(0, 80) : "Unknown",
          username: typeof p.username === "string" ? p.username.slice(0, 50) : "Unknown",
          playTime: Number.isFinite(p.playTime) ? Math.max(0, p.playTime) : 0,
          accountAge: Number.isFinite(p.accountAge) ? Math.max(0, p.accountAge) : 0,
          avatarUrl,
        })

        if (isNewToLiveSet) {
          try {
            await addActionLog(
              projectId,
              userId,
              typeof p.username === "string" ? p.username.slice(0, 50) : "Unknown",
              "join",
              JSON.stringify({ displayName: p.displayName || p.username, userId, avatarUrl }),
            )
          } catch { /* non-fatal */ }
        }

        knownUserIds.add(userId)
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
