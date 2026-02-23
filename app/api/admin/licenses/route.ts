import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { isGlobalAdmin, grantLicense, revokeLicense, getLicenses } from "@/lib/db"

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !isGlobalAdmin(session.userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const licenses = await getLicenses()
    return NextResponse.json({ licenses })
  } catch (error) {
    console.error("Licenses GET error:", error)
    return NextResponse.json({ error: "Failed to fetch licenses" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isGlobalAdmin(session.userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const { robloxUserId } = await req.json()
    if (!robloxUserId) return NextResponse.json({ error: "robloxUserId required" }, { status: 400 })

    await grantLicense(String(robloxUserId), session.userId, session.displayName)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("License grant error:", error)
    return NextResponse.json({ error: "Failed to grant license" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isGlobalAdmin(session.userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const userId = req.nextUrl.searchParams.get("userId")
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

    await revokeLicense(userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("License revoke error:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
