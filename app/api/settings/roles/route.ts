import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getProjectMember, getProjectMembers, updateMemberRole, removeMember, addActionLog } from "@/lib/db"
import { hasPermission } from "@/lib/roles"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const projectId = req.nextUrl.searchParams.get("projectId")
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })

    const member = await getProjectMember(projectId, session.userId)
    if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 })

    const role = member.role as "owner" | "admin" | "moderator"
    if (!hasPermission(role, "manage_roles")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const members = await getProjectMembers(projectId)
    return NextResponse.json({ members })
  } catch (error) {
    console.error("Roles GET error:", error)
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { projectId, userId, role, action: act } = body

    if (!projectId || !userId) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

    const member = await getProjectMember(projectId, session.userId)
    if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 })

    const myRole = member.role as "owner" | "admin" | "moderator"
    if (!hasPermission(myRole, "manage_roles")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    if (userId === session.userId) {
      return NextResponse.json({ error: "Cannot modify your own role" }, { status: 400 })
    }

    if (act === "remove") {
      await removeMember(projectId, userId)
      await addActionLog(projectId, session.userId, session.displayName, "member_removed", `Removed member ${userId}`)
    } else if (role) {
      await updateMemberRole(projectId, userId, role)
      await addActionLog(projectId, session.userId, session.displayName, "role_changed", `Set ${userId} to ${role}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Roles PATCH error:", error)
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 })
  }
}
