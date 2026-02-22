import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getConfig, addActionLog } from "@/lib/db"
import { publishMessage } from "@/lib/roblox"
import { hasPermission } from "@/lib/roles"
import { rateLimit } from "@/lib/rate-limit"
import { z } from "zod"

const commandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("kick"),
    userId: z.string().min(1, "Player user ID is required"),
    reason: z.string().max(200).optional().default("No reason provided"),
  }),
  z.object({
    type: z.literal("announce"),
    message: z.string().min(1, "Message is required").max(500),
  }),
])

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limit: 5 commands per minute
    const { allowed, remaining } = rateLimit(
      `cmd:${session.userId}`,
      5,
      60000
    )
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limited. Max 5 commands per minute." },
        { status: 429 }
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
    const parsed = commandSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid command", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const command = parsed.data
    const ip = request.headers.get("x-forwarded-for") || "unknown"

    // Check RBAC permissions
    if (command.type === "kick" && !hasPermission(session.role, "execute_kick")) {
      addActionLog({
        userId: session.userId,
        userName: session.displayName,
        action: `command:${command.type}`,
        details: `Denied: insufficient permissions`,
        ip,
        status: "error",
      })
      return NextResponse.json(
        { error: "You do not have permission to kick players" },
        { status: 403 }
      )
    }

    if (
      command.type === "announce" &&
      !hasPermission(session.role, "execute_announce")
    ) {
      return NextResponse.json(
        { error: "You do not have permission to send announcements" },
        { status: 403 }
      )
    }

    // Build the message payload
    const payload = JSON.stringify({
      ...command,
      issuedBy: session.displayName,
      issuedAt: new Date().toISOString(),
    })

    // Publish to Roblox MessagingService
    try {
      await publishMessage(
        config.universeId,
        "DashboardCommands",
        payload,
        config.apiKey
      )

      const details =
        command.type === "kick"
          ? `Kicked user ${command.userId}: ${command.reason}`
          : `Announcement: ${command.message}`

      addActionLog({
        userId: session.userId,
        userName: session.displayName,
        action: `command:${command.type}`,
        details,
        ip,
        status: "success",
      })

      return NextResponse.json({
        success: true,
        remaining,
        message: `Command executed: ${command.type}`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      addActionLog({
        userId: session.userId,
        userName: session.displayName,
        action: `command:${command.type}`,
        details: `Failed: ${message}`,
        ip,
        status: "error",
      })
      return NextResponse.json(
        { error: `Command failed: ${message}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Command error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
