import { getLicensesCollection } from "./mongodb"
import type { License } from "./types"

// Global admin - the person who manages all licenses across the platform
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || ""

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
  const collection = await getLicensesCollection()
  await collection.updateOne(
    { robloxUserId },
    {
      $set: {
        robloxUserId,
        robloxDisplayName,
        grantedBy,
        grantedByName,
        grantedAt: new Date(),
        active: true,
      } satisfies License,
    },
    { upsert: true }
  )
}

export async function revokeLicense(robloxUserId: string): Promise<void> {
  const collection = await getLicensesCollection()
  await collection.updateOne(
    { robloxUserId },
    { $set: { active: false } }
  )
}

export async function isLicensed(userId: string): Promise<boolean> {
  if (isGlobalAdmin(userId)) return true
  const collection = await getLicensesCollection()
  const license = await collection.findOne({
    robloxUserId: userId,
    active: true,
  })
  return license !== null
}

export async function getLicenses(): Promise<License[]> {
  const collection = await getLicensesCollection()
  const docs = await collection.find({}).sort({ grantedAt: -1 }).toArray()
  return docs as unknown as License[]
}

export async function getLicenseCount(): Promise<number> {
  const collection = await getLicensesCollection()
  return collection.countDocuments({ active: true })
}
