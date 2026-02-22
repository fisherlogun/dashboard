import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getConfig } from "@/lib/db"
import { getServers } from "@/lib/roblox"
import { rateLimit } from "@/lib/rate-limit"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { allowed } = rateLimit(`servers:${session.userId}`, 6, 60000)
    if (!allowed) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 })
    }

    const config = getConfig()
    if (!config) {
      return NextResponse.json(
        { error: "Setup not complete", setupRequired: true },
        { status: 400 }
      )
    }

    const serverData = await getServers(config.placeId)

    const servers = serverData.data.map(
      (s: { id: string; playing: number; maxPlayers: number; fps: number; ping: number }) => ({
        id: s.id,
        players: s.playing,
        maxPlayers: s.maxPlayers,
        fps: s.fps ?? 60,
        ping: s.ping ?? 0,
      })
    )

    return NextResponse.json({
      servers,
      total: servers.length,
    })
  } catch (error) {
    console.error("Servers error:", error)
    return NextResponse.json(
      { error: "Failed to fetch servers" },
      { status: 500 }
    )
  }
}
