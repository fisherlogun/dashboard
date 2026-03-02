import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getLiveServers, getLivePlayers, getPlayerHistory, getBans, getActionLogs, getProject, addPlayerHistoryPoint, cleanupOldPlayerHistory } from "@/lib/db"
import { getGameStats, getGameVotes, getFavoriteCount } from "@/lib/roblox"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get("projectId")
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })

  try {
    const project = await getProject(projectId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const [servers, players, history, bans, recentLogs, gameStats, votes, favCount] = await Promise.all([
      getLiveServers(projectId).catch(() => []),
      getLivePlayers(projectId).catch(() => []),
      getPlayerHistory(projectId, 180).catch(() => []),
      getBans(projectId).catch(() => []),
      getActionLogs(projectId).catch(() => []),
      getGameStats(project.universe_id).catch(() => null),
      getGameVotes(project.universe_id).catch(() => null),
      getFavoriteCount(project.universe_id).catch(() => 0),
    ])

    // Fetch game thumbnail from Roblox API
    let thumbnail = null
    try {
      const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${project.universe_id}&size=768x432&format=Png&isCircular=false`, {
        headers: { "User-Agent": "NexusDashboard" }
      })
      if (thumbRes.ok) {
        const thumbData = await thumbRes.json()
        if (thumbData.data?.[0]?.thumbnails?.[0]?.imageUrl) {
          thumbnail = thumbData.data[0].thumbnails[0].imageUrl
        }
      }
    } catch { /* non-fatal */ }

    // Clean up old data (keep only last 3 hours)
    try { await cleanupOldPlayerHistory(projectId, 180) } catch { /* non-fatal */ }

    const activeBans = bans.filter((b: Record<string, unknown>) => b.active)
    const totalPlayers = servers.reduce((sum: number, s: Record<string, unknown>) => sum + ((s.players as number) || 0), 0)

    // If no live servers/players but last history point had players > 0, record a zero
    if (totalPlayers === 0 && history.length > 0 && (history[0] as Record<string, unknown>).player_count !== 0) {
      try { await addPlayerHistoryPoint(projectId, 0, 0) } catch { /* non-fatal */ }
    }
    const totalCapacity = servers.reduce((sum: number, s: Record<string, unknown>) => sum + ((s.max_players as number) || 0), 0)
    const avgFps = servers.length > 0 ? servers.reduce((sum: number, s: Record<string, unknown>) => sum + ((s.fps as number) || 0), 0) / servers.length : 0
    const avgPing = servers.length > 0 ? servers.reduce((sum: number, s: Record<string, unknown>) => sum + ((s.ping as number) || 0), 0) / servers.length : 0

    // Filter for join logs only
    const joinLogs = (recentLogs as Record<string, unknown>[]).filter((log: Record<string, unknown>) => log.action === "join").slice(0, 10)

    return NextResponse.json({
      servers: servers.length,
      players: totalPlayers,
      totalCapacity,
      avgFps: Math.round(avgFps * 10) / 10,
      avgPing: Math.round(avgPing * 10) / 10,
      activeBans: activeBans.length,
      totalBans: bans.length,
      recentLogs: joinLogs,
      history: history.reverse(),
      game: gameStats ? {
        name: gameStats.name,
        playing: gameStats.playing,
        visits: gameStats.visits,
        favoritedCount: favCount,
        upVotes: votes?.upVotes ?? 0,
        downVotes: votes?.downVotes ?? 0,
        maxPlayers: gameStats.maxPlayers,
        thumbnail: thumbnail,
      } : null,
    })
  } catch (error) {
    console.error("Stats error:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
