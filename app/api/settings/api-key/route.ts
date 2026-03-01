import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getProjectById, getProjectMember, updateProject, addActionLog } from "@/lib/db"

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { projectId, newApiKey } = await req.json()
    if (!projectId || !newApiKey) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

    const member = await getProjectMember(projectId, session.userId)
    if (!member || member.role !== "owner") {
      return NextResponse.json({ error: "Only the owner can rotate API keys" }, { status: 403 })
    }

    const project = await getProjectById(projectId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    await updateProject(projectId, { apiKey: newApiKey })
    await addActionLog(projectId, session.userId, session.displayName, "api_key_rotated", "API key was rotated")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API key error:", error)
    return NextResponse.json({ error: "Failed to update API key" }, { status: 500 })
  }
}
