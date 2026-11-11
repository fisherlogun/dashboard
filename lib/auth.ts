import { EncryptJWT, jwtDecrypt } from "jose"
import { cookies } from "next/headers"
import { getSessionEncryptionKey } from "@/lib/session-key"

export const SESSION_COOKIE = "roblox_dash_session"
export const SESSION_MAX_AGE = 60 * 60 * 12

export interface SessionData {
  userId: string
  displayName: string
  profileUrl: string
  avatarUrl: string
  expiresAt: number
}

export async function createSession(data: SessionData): Promise<string> {
  const ownerId = process.env.ADMIN_USER_ID
  if (!ownerId || !/^\d+$/.test(ownerId) || data.userId !== ownerId) {
    throw new Error("Session user is not on the owner allowlist")
  }

  return new EncryptJWT({ ...data })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .encrypt(getSessionEncryptionKey())
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const ownerId = process.env.ADMIN_USER_ID
    if (!ownerId || !/^\d+$/.test(ownerId)) return null

    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return null

    const { payload } = await jwtDecrypt(token, getSessionEncryptionKey())
    if (payload.userId !== ownerId) return null

    return payload as unknown as SessionData
  } catch {
    return null
  }
}

export async function setSessionCookie(token: string, requestOrigin?: string) {
  const cookieStore = await cookies()
  const secureOrigin = requestOrigin?.startsWith("https://") ?? false
  const secure = process.env.NODE_ENV === "production" || secureOrigin
  const embeddedPreview = secureOrigin && process.env.NODE_ENV !== "production"
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: embeddedPreview ? "none" : "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}
