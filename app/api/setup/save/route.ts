import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { saveConfig, setUserRole } from "@/lib/db"
import { addActionLog } from "@/lib/db"
import { z } from "zod"

const saveSchema = z.object({
  apiKey: z.string().min(10),
  universeId: z.string().min(1),
  placeId: z.string().min(1),
  gameName: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.role !== "owner") {
      return NextResponse.json(
        { error: "Only the owner can complete setup" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = saveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { apiKey, universeId, placeId, gameName } = parsed.data

    saveConfig({
      apiKey,
      universeId,
      placeId,
      gameName,
      ownerId: session.userId,
      pollingInterval: 30,
    })

    // Ensure owner role is set
    setUserRole({
      userId: session.userId,
      displayName: session.displayName,
      role: "owner",
    })

    // Log action
    addActionLog({
      userId: session.userId,
      userName: session.displayName,
      action: "setup_complete",
      details: `Configured experience: ${gameName} (${universeId})`,
      ip: request.headers.get("x-forwarded-for") || "unknown",
      status: "success",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Save config error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
