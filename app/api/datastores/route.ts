import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getProjectById, getMemberRole } from "@/lib/db"
import {
  listDatastores,
  listDatastoreKeys,
  getDatastoreEntry,
  setDatastoreEntry,
} from "@/lib/roblox"
import { z } from "zod"

async function getProjectConfig(req: NextRequest, session: { userId: string }) {
  const projectId = req.nextUrl.searchParams.get("projectId") || req.headers.get("x-project-id")
  if (!projectId) return null
  const project = await getProjectById(projectId)
  if (!project) return null
  const role = await getMemberRole(projectId, session.userId)
  if (!role) return null
  return { project, role }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const ctx = await getProjectConfig(request, session)
    if (!ctx) return NextResponse.json({ error: "No project selected" }, { status: 400 })

    const { project } = ctx
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action") ?? "list"

    if (action === "list") {
      const cursor = searchParams.get("cursor") ?? undefined
      const result = await listDatastores(project.universe_id, project.api_key, cursor)
      return NextResponse.json(result)
    }

    if (action === "keys") {
      const name = searchParams.get("name")
      const scope = searchParams.get("scope") ?? "global"
      const cursor = searchParams.get("cursor") ?? undefined
      if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 })
      const result = await listDatastoreKeys(project.universe_id, name, scope, project.api_key, cursor)
      return NextResponse.json(result)
    }

    if (action === "get") {
      const name = searchParams.get("name")
      const scope = searchParams.get("scope") ?? "global"
      const key = searchParams.get("key")
      if (!name || !key) return NextResponse.json({ error: "name and key are required" }, { status: 400 })
      const data = await getDatastoreEntry(project.universe_id, name, scope, key, project.api_key)
      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

const setSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1),
  scope: z.string().default("global"),
  key: z.string().min(1),
  data: z.unknown(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const parsed = setSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 })

    const { projectId, name, scope, key, data } = parsed.data
    const project = await getProjectById(projectId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })
    const role = await getMemberRole(projectId, session.userId)
    if (!role) return NextResponse.json({ error: "Not a member" }, { status: 403 })

    await setDatastoreEntry(project.universe_id, name, scope, key, data, project.api_key)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
