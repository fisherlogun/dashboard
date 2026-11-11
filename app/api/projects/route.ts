import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getProjectsForUser } from "@/lib/db"

const SCUBA_UNIVERSE_ID = "10775422968"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const projects = await getProjectsForUser(session.userId)
    const gameProjects = projects
      .filter((project) => String(project.universe_id) === SCUBA_UNIVERSE_ID)
      .map((project) => Object.fromEntries(Object.entries(project).filter(([key]) => key !== "api_key")))

    return NextResponse.json({ projects: gameProjects })
  } catch (error) {
    console.error("Projects fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
  }
}
