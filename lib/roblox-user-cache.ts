import { ilike, inArray, or, sql } from "drizzle-orm"
import { db } from "@/lib/db/index"
import { robloxUserCache } from "@/lib/db/schema"

export interface RobloxProfile {
  userId: string
  username: string
  displayName: string
  avatarUrl: string | null
  updatedAt?: Date | string
}

const CACHE_MAX_AGE = 24 * 60 * 60 * 1000

async function fetchUserDetails(userIds: string[]) {
  const response = await fetch("https://users.roblox.com/v1/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userIds, excludeBannedUsers: false }),
    next: { revalidate: 0 },
  })
  if (!response.ok) throw new Error(`Roblox user lookup failed (${response.status})`)
  const result = await response.json()
  return (result.data ?? []).map((user: { id: number; name: string; displayName: string }) => ({
    userId: String(user.id),
    username: user.name,
    displayName: user.displayName,
    avatarUrl: null as string | null,
  })) as RobloxProfile[]
}

async function fetchHeadshots(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string>()
  const response = await fetch(
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userIds.join(",")}&size=48x48&format=Png&isCircular=false`,
    { next: { revalidate: 0 } },
  )
  if (!response.ok) return new Map<string, string>()
  const result = await response.json()
  return new Map<string, string>((result.data ?? []).map((item: { targetId: number; imageUrl?: string }) => [String(item.targetId), item.imageUrl ?? ""]))
}

async function refreshProfiles(userIds: string[]) {
  const profiles: RobloxProfile[] = []
  for (let index = 0; index < userIds.length; index += 100) {
    profiles.push(...await fetchUserDetails(userIds.slice(index, index + 100)))
  }
  for (let index = 0; index < profiles.length; index += 100) {
    const batch = profiles.slice(index, index + 100)
    const headshots = await fetchHeadshots(batch.map((profile) => profile.userId))
    for (const profile of batch) profile.avatarUrl = headshots.get(profile.userId) || null
  }
  if (profiles.length > 0) {
    await db.insert(robloxUserCache).values(profiles.map((profile) => ({
      robloxUserId: profile.userId,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      updatedAt: new Date(),
    }))).onConflictDoUpdate({
      target: robloxUserCache.robloxUserId,
      set: {
        username: sql`excluded.username`,
        displayName: sql`excluded.display_name`,
        avatarUrl: sql`excluded.avatar_url`,
        updatedAt: new Date(),
      },
    })
  }
  return profiles
}

export async function getRobloxProfiles(userIds: string[]) {
  const ids = [...new Set(userIds.filter((id) => /^\d{1,20}$/.test(id)))].slice(0, 100)
  if (ids.length === 0) return new Map<string, RobloxProfile>()

  const cached = await db.select().from(robloxUserCache).where(inArray(robloxUserCache.robloxUserId, ids))
  const byId = new Map(cached.map((profile) => [profile.robloxUserId, profile]))
  const stale = ids.filter((id) => {
    const record = byId.get(id)
    return !record || Date.now() - record.updatedAt.getTime() > CACHE_MAX_AGE
  })
  if (stale.length > 0) {
    try {
      const fresh = await refreshProfiles(stale)
      for (const profile of fresh) byId.set(profile.userId, { robloxUserId: profile.userId, ...profile, updatedAt: new Date() })
    } catch {
      // Keep stale names and avatars available when Roblox's public APIs are temporarily unavailable.
    }
  }

  return new Map(ids.flatMap((id) => {
    const profile = byId.get(id)
    return profile ? [[id, {
      userId: profile.robloxUserId,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      updatedAt: profile.updatedAt,
    } as RobloxProfile]] : []
  }))
}

export async function resolveRobloxUsername(username: string) {
  const response = await fetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
    next: { revalidate: 0 },
  })
  if (!response.ok) throw new Error(`Roblox username search failed (${response.status})`)
  const result = await response.json()
  return result.data?.[0]?.id ? String(result.data[0].id) : null
}

export async function searchCachedRobloxProfiles(query: string, projectUserIds: string[] = []) {
  const q = query.trim()
  if (!q) return []
  if (/^\d{1,20}$/.test(q)) {
    const profiles = await getRobloxProfiles([q])
    return [...profiles.values()]
  }

  const search = `%${q.replace(/[\\%_]/g, "\\$&")}%`
  const cached = await db.select().from(robloxUserCache).where(or(
    ilike(robloxUserCache.username, search),
    ilike(robloxUserCache.displayName, search),
  )).limit(50)
  const matches = new Map(cached.map((profile) => [profile.robloxUserId, profile]))
  for (const userId of projectUserIds.slice(0, 50)) {
    const profile = await getRobloxProfiles([userId])
    for (const [id, user] of profile) {
      if (user.username.toLowerCase().includes(q.toLowerCase()) || user.displayName.toLowerCase().includes(q.toLowerCase())) {
        matches.set(id, { robloxUserId: id, ...user, updatedAt: user.updatedAt instanceof Date ? user.updatedAt : new Date() })
      }
    }
  }

  if (matches.size === 0 && q.length <= 20) {
    try {
      const id = await resolveRobloxUsername(q)
      if (id) {
        const profile = await getRobloxProfiles([id])
        for (const [key, user] of profile) matches.set(key, { robloxUserId: key, ...user, updatedAt: user.updatedAt instanceof Date ? user.updatedAt : new Date() })
      }
    } catch {
      // Cached results remain usable if Roblox's username endpoint is unavailable.
    }
  }

  return [...matches.values()].map((profile) => ({
    userId: profile.robloxUserId,
    username: profile.username,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    updatedAt: profile.updatedAt,
  })).slice(0, 50)
}

export async function getCachedRobloxProfiles(userIds: string[]) {
  const ids = [...new Set(userIds.filter((id) => /^\d{1,20}$/.test(id)))].slice(0, 100)
  if (ids.length === 0) return []
  const rows = await db.select().from(robloxUserCache).where(inArray(robloxUserCache.robloxUserId, ids))
  return rows.map((row) => ({
    userId: row.robloxUserId,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    updatedAt: row.updatedAt,
  }))
}
