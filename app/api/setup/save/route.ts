import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { createProject, addActionLog } from "@/lib/db"
import { z } from "zod"

const saveSchema = z.object({
  apiKey: z.string().min(10),
  universeId: z.string().min(1),
  placeId: z.string().min(1),
  gameName: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = saveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }

    const { apiKey, universeId, placeId, gameName } = parsed.data

    const project = await createProject({
      name: gameName,
      universeId,
      placeId,
      apiKey,
      ownerId: session.userId,
    })

    addActionLog(
      project.id,
      session.userId,
      session.displayName,
      "project_created",
      `Created project: ${gameName} (${universeId})`,
      request.headers.get("x-forwarded-for") || ""
    )

    return NextResponse.json({ success: true, projectId: project.id })
  } catch (error) {
    console.error("Save config error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
