import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { isGlobalAdmin } from "@/lib/db"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
  return NextResponse.json({
    authenticated: true,
    user: {
      userId: session.userId,
      displayName: session.displayName,
      profileUrl: session.profileUrl,
      avatarUrl: session.avatarUrl,
      isGlobalAdmin: isGlobalAdmin(session.userId),
    },
  })
}
