import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getProject, updateProject, deleteProject, getMemberRole, isGlobalAdmin } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    const project = await getProject(id)
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const role = await getMemberRole(id, session.userId)
    if (!role && !isGlobalAdmin(session.userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    // Only owner sees api_key
    const safe = { ...project }
    if (role !== "owner" && !isGlobalAdmin(session.userId)) {
      safe.api_key = "***"
    }

    return NextResponse.json({ project: safe, role })
  } catch (error) {
    console.error("Project fetch error:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const role = await getMemberRole(id, session.userId)
  if (role !== "owner" && !isGlobalAdmin(session.userId)) {
    return NextResponse.json({ error: "Only the owner can edit a project" }, { status: 403 })
  }

  try {
    const body = await req.json()
    await updateProject(id, body)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Project update error:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const role = await getMemberRole(id, session.userId)
  if (role !== "owner" && !isGlobalAdmin(session.userId)) {
    return NextResponse.json({ error: "Only the owner can delete a project" }, { status: 403 })
  }

  try {
    await deleteProject(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Project delete error:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
