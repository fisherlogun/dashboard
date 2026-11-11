import { createHmac, timingSafeEqual } from "node:crypto"

const RELAY_KEY_DOMAIN = "scuba-simulator-relay-v1"

export function createProjectRelayKey(projectId: string) {
  const sessionSecret = process.env.SESSION_SECRET
  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters")
  }

  return createHmac("sha256", sessionSecret.slice(0, 32))
    .update(`${RELAY_KEY_DOMAIN}:${projectId}`)
    .digest("hex")
}

export function verifyProjectRelayKey(projectId: string, candidate: string | null) {
  if (!candidate || !/^[a-f0-9]{64}$/i.test(candidate)) return false

  const expected = Buffer.from(createProjectRelayKey(projectId), "hex")
  const supplied = Buffer.from(candidate, "hex")
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}
