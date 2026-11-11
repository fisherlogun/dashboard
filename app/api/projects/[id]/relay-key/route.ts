import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getMemberRole, getProject, isGlobalAdmin } from "@/lib/db"
import { createProjectRelayKey } from "@/lib/relay-auth"

export const runtime = "nodejs"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const [project, role] = await Promise.all([getProject(id), getMemberRole(id, session.userId)])
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })
  if (role !== "owner" && !isGlobalAdmin(session.userId)) {
    return NextResponse.json({ error: "Owner access required" }, { status: 403 })
  }

  return NextResponse.json({ relayKey: createProjectRelayKey(id) })
}
