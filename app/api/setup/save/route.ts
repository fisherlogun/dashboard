import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    { error: "Project creation is disabled for this single-game owner console." },
    { status: 410 },
  )
}
