import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getAllRoles, setUserRole, removeUserRole, addActionLog } from "@/lib/db"
import { hasPermission } from "@/lib/roles"
import { z } from "zod"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!hasPermission(session.role, "manage_roles")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const roles = getAllRoles()
    return NextResponse.json({ roles })
  } catch (error) {
    console.error("Roles error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1),
  role: z.enum(["owner", "admin", "moderator"]),
})

const deleteRoleSchema = z.object({
  userId: z.string().min(1),
  action: z.literal("remove"),
})

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!hasPermission(session.role, "manage_roles")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const ip = request.headers.get("x-forwarded-for") || "unknown"

    // Handle removal
    const deleteResult = deleteRoleSchema.safeParse(body)
    if (deleteResult.success) {
      if (deleteResult.data.userId === session.userId) {
        return NextResponse.json(
          { error: "Cannot remove your own role" },
          { status: 400 }
        )
      }
      removeUserRole(deleteResult.data.userId)
      addActionLog({
        userId: session.userId,
        userName: session.displayName,
        action: "role_removed",
        details: `Removed role for user ${deleteResult.data.userId}`,
        ip,
        status: "success",
      })
      return NextResponse.json({ success: true })
    }

    // Handle update
    const parsed = updateRoleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Cannot change own role
    if (parsed.data.userId === session.userId) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 400 }
      )
    }

    setUserRole(parsed.data)

    addActionLog({
      userId: session.userId,
      userName: session.displayName,
      action: "role_changed",
      details: `Set ${parsed.data.displayName} to ${parsed.data.role}`,
      ip,
      status: "success",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Role update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
