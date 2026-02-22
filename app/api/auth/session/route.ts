import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { isSetupComplete } from "@/lib/db"
import { isGlobalAdmin } from "@/lib/admin"

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
      role: session.role,
      setupComplete: isSetupComplete(),
      isGlobalAdmin: isGlobalAdmin(session.userId),
    },
  })
}
