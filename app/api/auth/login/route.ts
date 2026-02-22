import { NextRequest, NextResponse } from "next/server"
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  setPKCECookie,
  setStateCookie,
} from "@/lib/auth"

function getBaseUrl(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000"
  const proto = request.headers.get("x-forwarded-proto") || "https"
  return `${proto}://${host}`
}

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.ROBLOX_CLIENT_ID
    if (!clientId) {
      return NextResponse.json(
        { error: "Missing ROBLOX_CLIENT_ID" },
        { status: 500 }
      )
    }

    const baseUrl = getBaseUrl(request)
    console.log("[v0] OAuth redirect_uri:", `${baseUrl}/api/auth/callback`)
    console.log("[v0] Base URL derived from headers - host:", request.headers.get("x-forwarded-host") || request.headers.get("host"), "proto:", request.headers.get("x-forwarded-proto"))
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    const state = generateState()

    await setPKCECookie(codeVerifier)
    await setStateCookie(state)

    const params = new URLSearchParams({
      client_id: clientId,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      redirect_uri: `${baseUrl}/api/auth/callback`,
      scope: "openid profile",
      response_type: "code",
      state,
    })

    const authorizeUrl = `https://apis.roblox.com/oauth/v1/authorize?${params}`
    return NextResponse.redirect(authorizeUrl)
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.redirect(
      new URL("/login?error=auth_failed", getBaseUrl(request))
    )
  }
}
