import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getConfig, updateConfig, addActionLog } from "@/lib/db"
import { hasPermission } from "@/lib/roles"
import { z } from "zod"

const rotateSchema = z.object({
  newApiKey: z.string().min(10, "API key must be at least 10 characters"),
})

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!hasPermission(session.role, "manage_api_key")) {
      return NextResponse.json(
        { error: "Only the owner can manage API keys" },
        { status: 403 }
      )
    }

    const config = getConfig()
    if (!config) {
      return NextResponse.json(
        { error: "Setup not complete" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = rotateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    updateConfig({ apiKey: parsed.data.newApiKey })

    const ip = request.headers.get("x-forwarded-for") || "unknown"
    addActionLog({
      userId: session.userId,
      userName: session.displayName,
      action: "api_key_rotated",
      details: "API key was rotated",
      ip,
      status: "success",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API key error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
