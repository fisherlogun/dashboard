import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getProjectById, getProjectMember, updateProject, addActionLog } from "@/lib/db"

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { projectId, newApiKey } = await req.json()
    if (!projectId || !newApiKey) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

    if (typeof newApiKey !== "string" || newApiKey.trim().length < 16 || newApiKey.length > 4096) {
      return NextResponse.json({ error: "Open Cloud key must be between 16 and 4096 characters" }, { status: 400 })
    }

    const project = await getProjectById(projectId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const member = await getProjectMember(projectId, session.userId)
    if (project.owner_id !== session.userId && member?.role !== "owner") {
      return NextResponse.json({ error: "Only the owner can rotate API keys" }, { status: 403 })
    }

    await updateProject(projectId, { apiKey: newApiKey.trim() })
    await addActionLog(projectId, session.userId, session.displayName, "api_key_rotated", "API key was rotated")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API key error:", error)
    return NextResponse.json({ error: "Failed to update API key" }, { status: 500 })
  }
}
