import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getProjectMembers, addProjectMember, removeProjectMember, getMemberRole, isGlobalAdmin } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    const members = await getProjectMembers(id)
    return NextResponse.json({ members })
  } catch (error) {
    console.error("Members fetch error:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const myRole = await getMemberRole(id, session.userId)
  if (myRole !== "owner" && myRole !== "admin" && !isGlobalAdmin(session.userId)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  try {
    const { userId, role } = await req.json()
    if (!userId || !role) return NextResponse.json({ error: "userId and role required" }, { status: 400 })
    if (!["admin", "moderator"].includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 })

    await addProjectMember(id, userId, role)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Member add error:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const myRole = await getMemberRole(id, session.userId)
  if (myRole !== "owner" && !isGlobalAdmin(session.userId)) {
    return NextResponse.json({ error: "Only owner can remove members" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

    await removeProjectMember(id, userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Member remove error:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
