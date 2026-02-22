import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getActionLogs } from "@/lib/db"
import { hasPermission } from "@/lib/roles"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canViewAll = hasPermission(session.role, "view_logs")
    const canViewOwn = hasPermission(session.role, "view_own_logs")

    if (!canViewAll && !canViewOwn) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const offset = parseInt(searchParams.get("offset") || "0")
    const action = searchParams.get("action") || undefined
    const status = searchParams.get("status") as "success" | "error" | undefined

    const result = getActionLogs({
      limit,
      offset,
      action,
      status,
      userId: canViewAll ? undefined : session.userId,
    })

    return NextResponse.json({
      logs: result.logs.map((log) => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
      })),
      total: result.total,
      limit,
      offset,
    })
  } catch (error) {
    console.error("Logs error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
