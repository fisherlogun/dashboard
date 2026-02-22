import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getUniverseInfo } from "@/lib/roblox"
import { z } from "zod"

const validateSchema = z.object({
  apiKey: z.string().min(10, "API key is required"),
  universeId: z.string().min(1, "Universe ID is required"),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = validateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { apiKey, universeId } = parsed.data

    // Validate API key by trying to get universe info
    try {
      const info = await getUniverseInfo(universeId, apiKey)
      return NextResponse.json({
        valid: true,
        gameName: info.displayName || `Universe ${universeId}`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      if (message.includes("401") || message.includes("403")) {
        return NextResponse.json({
          valid: false,
          error: "Invalid API key or insufficient permissions. Ensure the key has access to this universe.",
        })
      }
      if (message.includes("404")) {
        return NextResponse.json({
          valid: false,
          error: "Universe not found. Please check the Universe ID.",
        })
      }
      return NextResponse.json({
        valid: false,
        error: `Validation failed: ${message}`,
      })
    }
  } catch (error) {
    console.error("Validate error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
