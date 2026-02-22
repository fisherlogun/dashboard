import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { z } from "zod"

const ROBLOX_USERS_BASE = "https://users.roblox.com/v1"

const searchSchema = z.object({
  keyword: z.string().min(1).max(50),
})

// GET /api/players?keyword=...
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get("keyword")

    const parsed = searchSchema.safeParse({ keyword })
    if (!parsed.success) {
      return NextResponse.json(
        { error: "keyword query param is required (1-50 chars)" },
        { status: 400 }
      )
    }

    // Search by user ID (numeric) or username
    const isNumeric = /^\d+$/.test(parsed.data.keyword)

    if (isNumeric) {
      // Look up by user ID
      const res = await fetch(`${ROBLOX_USERS_BASE}/users/${parsed.data.keyword}`)
      if (!res.ok) {
        return NextResponse.json({ players: [] })
      }
      const user = await res.json()
      return NextResponse.json({
        players: [
          {
            id: user.id,
            name: user.name,
            displayName: user.displayName,
          },
        ],
      })
    } else {
      // Search by username
      const res = await fetch(`${ROBLOX_USERS_BASE}/usernames/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernames: [parsed.data.keyword],
          excludeBannedUsers: false,
        }),
      })
      if (!res.ok) {
        return NextResponse.json({ players: [] })
      }
      const data = await res.json()
      const players = (data.data ?? []).map((u: { id: number; name: string; displayName: string }) => ({
        id: u.id,
        name: u.name,
        displayName: u.displayName,
      }))
      return NextResponse.json({ players })
    }
  } catch (error) {
    console.error("Player search error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
