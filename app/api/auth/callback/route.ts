import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json(
    { error: "Roblox OAuth sign-in has been disabled for this private console." },
    { status: 410 },
  )
}
