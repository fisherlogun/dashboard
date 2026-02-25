import { NextRequest, NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes - no auth needed
  const publicRoutes = ["/login", "/unauthorized", "/api/auth/login", "/api/auth/callback", "/api/relay/", "/api/heartbeat", "/api/check-ban"]
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get("roblox_dash_session")

  // Protected dashboard
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/setup")) {
    if (!sessionCookie?.value) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  // Protected API routes (except /api/auth and /api/relay)
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/") && !pathname.startsWith("/api/relay/") && !pathname.startsWith("/api/heartbeat") && !pathname.startsWith("/api/check-ban")) {
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/setup/:path*",
    "/api/:path*",
  ],
}
