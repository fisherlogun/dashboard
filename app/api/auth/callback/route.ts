import { NextRequest, NextResponse } from "next/server"
import {
  getPKCECookie,
  getStateCookie,
  createSession,
  setSessionCookie,
  type SessionData,
} from "@/lib/auth"
import { exchangeCodeForTokens, getUserInfo } from "@/lib/roblox"
import { upsertUser, isGlobalAdmin, isLicensed, grantLicense } from "@/lib/db"

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

    if (error) return NextResponse.redirect(new URL(`/login?error=${error}`, baseUrl))
    if (!code || !state) return NextResponse.redirect(new URL("/login?error=missing_params", baseUrl))

    const savedState = await getStateCookie()
    if (state !== savedState) return NextResponse.redirect(new URL("/login?error=state_mismatch", baseUrl))

    const codeVerifier = await getPKCECookie()
    if (!codeVerifier) return NextResponse.redirect(new URL("/login?error=missing_pkce", baseUrl))

    const tokens = await exchangeCodeForTokens(code, codeVerifier, `${baseUrl}/api/auth/callback`)
    const userInfo = await getUserInfo(tokens.access_token)

    const userId = userInfo.sub
    const isAdmin = isGlobalAdmin(userId)

    // Upsert user in Neon DB
    await upsertUser({
      id: userId,
      displayName: userInfo.name || userInfo.preferred_username,
      avatarUrl: userInfo.picture || "",
      profileUrl: userInfo.profile || "",
    })

    // Auto-grant license to global admin
    if (isAdmin) {
      await grantLicense(userId, "system", "System (Auto)")
    } else {
      const licensed = await isLicensed(userId)
      if (!licensed) {
        return NextResponse.redirect(new URL("/unauthorized", baseUrl))
      }
    }

    const sessionData: SessionData = {
      userId,
      displayName: userInfo.name || userInfo.preferred_username,
      profileUrl: userInfo.profile || "",
      avatarUrl: userInfo.picture || "",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    }

    const sessionToken = await createSession(sessionData)
    await setSessionCookie(sessionToken)

    return NextResponse.redirect(new URL("/dashboard", baseUrl))
  } catch (error) {
    console.error("Callback error:", error)
    return NextResponse.redirect(new URL("/login?error=callback_failed", getBaseUrl(request)))
  }
}
