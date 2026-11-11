import { NextRequest, NextResponse } from "next/server"
import { jwtDecrypt } from "jose"

const OWNER_SESSION_COOKIE = "roblox_dash_session"
const PUBLIC_AUTH_ROUTES = new Set([
  "/api/auth/login",
  "/api/auth/session",
  "/api/auth/logout",
  "/api/auth/callback",
])
const ROBLOX_SERVER_ROUTES = new Set([
  "/api/relay/heartbeat",
  "/api/relay/join",
  "/api/relay/leave",
  "/api/heartbeat",
  "/api/check-ban",
])

async function hasOwnerSession(request: NextRequest) {
  const token = request.cookies.get(OWNER_SESSION_COOKIE)?.value
  const secret = process.env.SESSION_SECRET
  const ownerId = process.env.ADMIN_USER_ID
  if (!token || !secret || secret.length < 32 || !ownerId || !/^\d+$/.test(ownerId)) return false

  try {
    const key = new TextEncoder().encode(secret.slice(0, 32))
    const { payload } = await jwtDecrypt(token, key)
    return payload.userId === ownerId
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthRoute = PUBLIC_AUTH_ROUTES.has(pathname)
  const isRobloxServerRoute = ROBLOX_SERVER_ROUTES.has(pathname)
  const isLoginPage = pathname === "/login" && request.method === "GET"

  if (isAuthRoute || isRobloxServerRoute || isLoginPage) {
    return NextResponse.next()
  }

  const isApi = pathname.startsWith("/api/")
  const isPrivatePage = pathname === "/" || pathname.startsWith("/dashboard/") || pathname === "/dashboard" || pathname.startsWith("/setup/") || pathname === "/setup"
  if (!isApi && !isPrivatePage) return NextResponse.next()

  if (!isRobloxServerRoute && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin")
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  if (await hasOwnerSession(request)) return NextResponse.next()

  if (isApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.redirect(new URL("/login?reason=expired", request.url))
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/setup/:path*", "/api/:path*"],
}
