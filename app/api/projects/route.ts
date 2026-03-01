import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getProjectsForUser, createProject, isGlobalAdmin } from "@/lib/db"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const projects = await getProjectsForUser(session.userId)
    return NextResponse.json({ projects })
  } catch (error) {
    console.error("Projects fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { name, universeId, placeId, apiKey } = body

    if (!name || !universeId || !placeId || !apiKey) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const project = await createProject({
      name,
      universeId,
      placeId,
      apiKey,
      ownerId: session.userId,
    })

    return NextResponse.json({ project })
  } catch (error) {
    console.error("Project create error:", error)
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}
