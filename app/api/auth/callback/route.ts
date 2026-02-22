import { NextRequest, NextResponse } from "next/server"
import {
  getPKCECookie,
  getStateCookie,
  createSession,
  setSessionCookie,
  type SessionData,
} from "@/lib/auth"
import { exchangeCodeForTokens, getUserInfo } from "@/lib/roblox"
import { getUserRole, setUserRole, getAllRoles, isSetupComplete } from "@/lib/db"
import { isLicensed, isGlobalAdmin, grantLicense } from "@/lib/admin"

function getBaseUrl(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000"
  const proto = request.headers.get("x-forwarded-proto") || "https"
  return `${proto}://${host}`
}

export async function GET(request: NextRequest) {
  try {
    const baseUrl = getBaseUrl(request)
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${error}`, baseUrl)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/login?error=missing_params", baseUrl)
      )
    }

    // Verify state
    const savedState = await getStateCookie()
    if (state !== savedState) {
      return NextResponse.redirect(
        new URL("/login?error=state_mismatch", baseUrl)
      )
    }

    // Get PKCE verifier
    const codeVerifier = await getPKCECookie()
    if (!codeVerifier) {
      return NextResponse.redirect(
        new URL("/login?error=missing_pkce", baseUrl)
      )
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(
      code,
      codeVerifier,
      `${baseUrl}/api/auth/callback`
    )

    // Get user info
    const userInfo = await getUserInfo(tokens.access_token)

    // Check license - global admin always allowed, otherwise must be licensed
    const userId = userInfo.sub
    const isAdmin = isGlobalAdmin(userId)

    if (isAdmin) {
      // Auto-whitelist the global admin in the licenses collection
      try {
        await grantLicense(
          userId,
          userInfo.name || userInfo.preferred_username,
          userId,
          "System (Auto-Whitelist)"
        )
      } catch {
        // Non-fatal - admin can still access via isGlobalAdmin check
      }
    } else {
      const licensed = await isLicensed(userId)
      if (!licensed) {
        return NextResponse.redirect(
          new URL("/unauthorized", baseUrl)
        )
      }
    }

    // Determine role - first user becomes owner
    let existingRole = getUserRole(userInfo.sub)
    if (!existingRole) {
      const allRoles = getAllRoles()
      const role = allRoles.length === 0 ? "owner" : "moderator"
      existingRole = {
        userId: userInfo.sub,
        displayName: userInfo.name || userInfo.preferred_username,
        role,
      }
      setUserRole(existingRole)
    }

    // Create session
    const sessionData: SessionData = {
      userId: userInfo.sub,
      displayName: userInfo.name || userInfo.preferred_username,
      profileUrl: userInfo.profile || "",
      avatarUrl: userInfo.picture || "",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      role: existingRole.role,
      setupComplete: isSetupComplete(),
      expiresAt: Date.now() + tokens.expires_in * 1000,
    }

    const sessionToken = await createSession(sessionData)
    await setSessionCookie(sessionToken)

    // Redirect based on setup status
    if (!isSetupComplete() && existingRole.role === "owner") {
      return NextResponse.redirect(new URL("/setup", baseUrl))
    }

    return NextResponse.redirect(new URL("/dashboard", baseUrl))
  } catch (error) {
    console.error("Callback error:", error)
    return NextResponse.redirect(
      new URL("/login?error=callback_failed", getBaseUrl(request))
    )
  }
}
