import { NextResponse } from "next/server"
import { getSession, clearSession } from "@/lib/auth"
import { revokeToken } from "@/lib/roblox"

export async function POST() {
  try {
    const session = await getSession()
    if (session?.accessToken) {
      await revokeToken(session.accessToken).catch(() => {})
    }
    await clearSession()
    return NextResponse.json({ success: true })
  } catch {
    await clearSession()
    return NextResponse.json({ success: true })
  }
}
