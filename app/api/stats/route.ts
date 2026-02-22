import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getConfig, addPlayerHistoryPoint, getPlayerHistory } from "@/lib/db"
import { getGameStats, getGameVotes, getServers } from "@/lib/roblox"
import { rateLimit } from "@/lib/rate-limit"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limit: 1 request per 10 seconds per user
    const { allowed } = rateLimit(`stats:${session.userId}`, 6, 60000)
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limited. Please wait before refreshing." },
        { status: 429 }
      )
    }

    const config = getConfig()
    if (!config) {
      return NextResponse.json(
        { error: "Setup not complete", setupRequired: true },
        { status: 400 }
      )
    }

    // Fetch stats in parallel from Roblox APIs
    const [gameStats, gameVotes, servers] = await Promise.allSettled([
      getGameStats(config.universeId),
      getGameVotes(config.universeId),
      getServers(config.placeId),
    ])

    const stats = gameStats.status === "fulfilled" ? gameStats.value : null
    const votes = gameVotes.status === "fulfilled" ? gameVotes.value : null
    const serverData =
      servers.status === "fulfilled" ? servers.value : { data: [], nextPageCursor: null }

    const activePlayers = stats?.playing ?? 0
    const totalVisits = stats?.visits ?? 0
    const serverCount = serverData.data.length
    const favorites = stats?.favoritedCount ?? 0
    const likes = votes?.upVotes ?? 0
    const dislikes = votes?.downVotes ?? 0

    // Record player history
    addPlayerHistoryPoint(activePlayers)

    const history = getPlayerHistory().map((p) => ({
      time: p.timestamp.toISOString(),
      players: p.players,
    }))

    return NextResponse.json({
      activePlayers,
      totalVisits,
      serverCount,
      favorites,
      likes,
      dislikes,
      gameName: config.gameName,
      history,
      lastUpdated: new Date().toISOString(),
      serverStatus: stats !== null ? "online" : "unknown",
    })
  } catch (error) {
    console.error("Stats error:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
