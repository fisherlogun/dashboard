import { createHmac, timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { createSession, setSessionCookie } from "@/lib/auth"

const failedAttempts = new Map<string, { count: number; resetAt: number; blockedUntil: number }>()
const MAX_FAILED_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000
const BLOCK_MS = 15 * 60 * 1000

function getClientKey(request: NextRequest) {
  return request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown"
}

function comparePassword(candidate: string, expected: string, secret: string) {
  const candidateDigest = createHmac("sha256", secret).update(candidate).digest()
  const expectedDigest = createHmac("sha256", secret).update(expected).digest()
  return timingSafeEqual(candidateDigest, expectedDigest)
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin")
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const password = typeof body === "object" && body !== null && "password" in body
    ? (body as { password?: unknown }).password
    : null
  const submittedOwnerId = typeof body === "object" && body !== null && "ownerId" in body
    ? (body as { ownerId?: unknown }).ownerId
    : null
  if (typeof password !== "string" || password.length > 256 || typeof submittedOwnerId !== "string" || submittedOwnerId.length > 20) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const configuredPassword = process.env.ADMIN_DASHBOARD_PASSWORD
  const sessionSecret = process.env.SESSION_SECRET
  const ownerId = process.env.ADMIN_USER_ID
  if (!configuredPassword || configuredPassword.length < 16 || !sessionSecret || sessionSecret.length < 32 || !ownerId || !/^\d+$/.test(ownerId)) {
    return NextResponse.json({ error: "Private sign-in is not configured" }, { status: 503 })
  }

  const now = Date.now()
  const clientKey = getClientKey(request)
  const attempt = failedAttempts.get(clientKey)
  if (attempt?.blockedUntil && attempt.blockedUntil > now) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
  }
  if (attempt && attempt.resetAt <= now) failedAttempts.delete(clientKey)

  const hasAllowedOwnerId = submittedOwnerId === ownerId
  const hasCorrectPassword = comparePassword(password, configuredPassword, sessionSecret)
  if (!hasAllowedOwnerId || !hasCorrectPassword) {
    const current = failedAttempts.get(clientKey)
    const next = current && current.resetAt > now
      ? { ...current, count: current.count + 1 }
      : { count: 1, resetAt: now + WINDOW_MS, blockedUntil: 0 }
    if (next.count >= MAX_FAILED_ATTEMPTS) next.blockedUntil = now + BLOCK_MS
    failedAttempts.set(clientKey, next)
    if (failedAttempts.size > 2000) {
      for (const [key, value] of failedAttempts) {
        if (value.resetAt <= now && value.blockedUntil <= now) failedAttempts.delete(key)
      }
    }
    return NextResponse.json({ error: "Incorrect owner ID or password" }, { status: 401 })
  }

  failedAttempts.delete(clientKey)
  const token = await createSession({
    userId: ownerId,
    displayName: "Scuba Simulator Owner",
    profileUrl: `https://www.roblox.com/users/${ownerId}/profile`,
    avatarUrl: "",
    expiresAt: now + 12 * 60 * 60 * 1000,
  })
  await setSessionCookie(token, request.nextUrl.origin)

  return NextResponse.json({ success: true })
}
