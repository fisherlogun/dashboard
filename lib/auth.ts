import { EncryptJWT, jwtDecrypt } from "jose"
import { cookies } from "next/headers"

const SESSION_COOKIE = "roblox_dash_session"
const PKCE_COOKIE = "roblox_pkce"
const STATE_COOKIE = "roblox_oauth_state"

// Auto-generate a stable session secret if none is provided.
// In production you should set SESSION_SECRET for persistence across restarts.
let _cachedSecret: Uint8Array | null = null
function getSecretKey() {
  if (_cachedSecret) return _cachedSecret
  const envSecret = process.env.SESSION_SECRET
  if (envSecret && envSecret.length >= 32) {
    _cachedSecret = new TextEncoder().encode(envSecret.slice(0, 32))
    return _cachedSecret
  }
  // Generate a random secret for the lifetime of this process
  _cachedSecret = new Uint8Array(32)
  crypto.getRandomValues(_cachedSecret)
  return _cachedSecret
}

export interface SessionData {
  userId: string
  displayName: string
  profileUrl: string
  avatarUrl: string
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export async function createSession(data: SessionData): Promise<string> {
  const secret = getSecretKey()
  const token = await new EncryptJWT({ ...data })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .encrypt(secret)
  return token
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE)
    if (!sessionCookie?.value) return null

    const secret = getSecretKey()
    const { payload } = await jwtDecrypt(sessionCookie.value, secret)
    return payload as unknown as SessionData
  } catch {
    return null
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  cookieStore.delete(PKCE_COOKIE)
  cookieStore.delete(STATE_COOKIE)
}

export async function setPKCECookie(codeVerifier: string) {
  const cookieStore = await cookies()
  cookieStore.set(PKCE_COOKIE, codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  })
}

export async function getPKCECookie(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(PKCE_COOKIE)?.value ?? null
}

export async function setStateCookie(state: string) {
  const cookieStore = await cookies()
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  })
}

export async function getStateCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(STATE_COOKIE)?.value ?? null
}

// PKCE helpers
function base64URLEncode(buffer: Uint8Array): string {
  let str = ""
  for (const byte of buffer) {
    str += String.fromCharCode(byte)
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64URLEncode(array)
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return base64URLEncode(new Uint8Array(digest))
}

export function generateState(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return base64URLEncode(array)
}
