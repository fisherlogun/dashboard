import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { isGlobalAdmin, grantLicense, revokeLicense, getLicenses } from "@/lib/admin"

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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch licenses" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isGlobalAdmin(session.userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { robloxUserId, robloxDisplayName } = body

    if (!robloxUserId || !robloxDisplayName) {
      return NextResponse.json(
        { error: "robloxUserId and robloxDisplayName are required" },
        { status: 400 }
      )
    }

    await grantLicense(
      String(robloxUserId),
      String(robloxDisplayName),
      session.userId,
      session.displayName
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("License grant error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to grant license" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isGlobalAdmin(session.userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const robloxUserId = searchParams.get("userId")
    if (!robloxUserId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }

    await revokeLicense(robloxUserId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("License revoke error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to revoke license" },
      { status: 500 }
    )
  }
}
