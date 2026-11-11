export function getSessionEncryptionKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be configured with at least 32 characters")
  }

  return new TextEncoder().encode(secret.slice(0, 32))
}
