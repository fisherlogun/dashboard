import type { License } from "./types"

// Global admin - the person who manages all licenses across the platform
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || ""

// In-memory license store (same pattern as db.ts)
const licenses: Map<string, License> = new Map()

// Auto-whitelist the global admin on module load
if (ADMIN_USER_ID) {
  licenses.set(ADMIN_USER_ID, {
    robloxUserId: ADMIN_USER_ID,
    robloxDisplayName: "Global Admin",
    grantedBy: "system",
    grantedByName: "System (Auto-Whitelist)",
    grantedAt: new Date(),
    active: true,
  })
}

export function isGlobalAdmin(userId: string): boolean {
  if (!ADMIN_USER_ID) return false
  return userId === ADMIN_USER_ID
}

export async function grantLicense(
  robloxUserId: string,
  robloxDisplayName: string,
  grantedBy: string,
  grantedByName: string
): Promise<void> {
  licenses.set(robloxUserId, {
    robloxUserId,
    robloxDisplayName,
    grantedBy,
    grantedByName,
    grantedAt: new Date(),
    active: true,
  })
}

export async function revokeLicense(robloxUserId: string): Promise<void> {
  const license = licenses.get(robloxUserId)
  if (license) {
    license.active = false
    licenses.set(robloxUserId, license)
  }
}

export async function isLicensed(userId: string): Promise<boolean> {
  if (isGlobalAdmin(userId)) return true
  const license = licenses.get(userId)
  return license !== null && license !== undefined && license.active
}

export async function getLicenses(): Promise<License[]> {
  return Array.from(licenses.values()).sort(
    (a, b) => new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime()
  )
}

export async function getLicenseCount(): Promise<number> {
  return Array.from(licenses.values()).filter((l) => l.active).length
}
