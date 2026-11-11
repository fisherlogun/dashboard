import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { addActionLog, getLivePlayers, getMemberRole, getProjectById, isGlobalAdmin } from "@/lib/db"
import { BREW_IDS, FIND_IDS, GEAR_BY_SLOT, GEAR_IDS, ISLAND_IDS, SECRET_SITES, VARIANTS } from "@/lib/game-catalog"
import { getRobloxProfiles, resolveRobloxUsername, searchCachedRobloxProfiles } from "@/lib/roblox-user-cache"
import {
  DatastoreConflictError,
  getDatastoreEntryVersion,
  getVersionedDatastoreEntry,
  listDatastoreEntryVersions,
  listDatastoreKeys,
  publishMessage,
  setVersionedDatastoreEntry,
} from "@/lib/roblox"
import { getSession } from "@/lib/auth"

export const runtime = "nodejs"

type RobloxProject = { universe_id: string; api_key: string }

const PROFILE_STORE = "DeepDive_PlayerData_v1"
const CONTROL_STORE = "ScubaOps"
const READ_ONLY_FIELDS = ["Earned", "Index", "Places", "Quests", "Achievements", "CompletedZones", "Daily", "Stats", "Receipts", "AdminSeen", "_lock", "Version", "FirstJoin"]
const profileObjectSchema = z.record(z.string(), z.unknown())

class ProfileConflictError extends Error {
  constructor(public fields: string[]) {
    super("Some profile fields changed after this profile was opened")
    this.name = "ProfileConflictError"
  }
}

class ProfileApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = "ProfileApiError"
  }
}

function responseForError(error: unknown) {
  if (error instanceof ProfileConflictError) return NextResponse.json({ error: error.message, fields: error.fields }, { status: 409 })
  if (error instanceof ProfileApiError) return NextResponse.json({ error: error.message }, { status: error.status })
  if (error instanceof DatastoreConflictError) return NextResponse.json({ error: "The DataStore entry changed during the update. Refresh and try again." }, { status: 409 })
  return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 500 })
}

async function getProjectContext(projectId: string) {
  const session = await getSession()
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const
  const project = await getProjectById(projectId)
  if (!project) return { error: NextResponse.json({ error: "Project not found" }, { status: 404 }) } as const
  const role = await getMemberRole(projectId, session.userId)
  if (!role && !isGlobalAdmin(session.userId)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const
  return { session, project: project as RobloxProject } as const
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function isOnline(userId: string, profile: Record<string, unknown>, liveIds: Set<string>) {
  if (liveIds.has(userId)) return true
  const lock = isPlainRecord(profile._lock) ? profile._lock : null
  const lockTime = Number(lock?.t)
  const nowSeconds = Math.floor(Date.now() / 1000)
  return Number.isFinite(lockTime) && lockTime > 0 && nowSeconds - lockTime < 600 && lockTime <= nowSeconds + 300
}

function validateProfile(profile: Record<string, unknown>, fields: string[] = Object.keys(profile), baseData: Record<string, unknown> = {}) {
  const integerRules: Record<string, { min: number; max: number }> = {
    Cash: { min: 0, max: Number.MAX_SAFE_INTEGER },
    Earned: { min: 0, max: Number.MAX_SAFE_INTEGER },
    Level: { min: 1, max: 999 },
    XP: { min: 0, max: Number.MAX_SAFE_INTEGER },
    Rebirths: { min: 0, max: Number.MAX_SAFE_INTEGER },
  }
  for (const [field, range] of Object.entries(integerRules)) {
    if (!fields.includes(field) || profile[field] === undefined) continue
    const value = profile[field]
    if (!Number.isSafeInteger(value) || Number(value) < range.min || Number(value) > range.max) {
      throw new ProfileApiError(400, `${field} must be a valid integer between ${range.min} and ${range.max}`)
    }
  }
  if (fields.includes("Island") && profile.Island !== undefined && profile.Island !== "" && !ISLAND_IDS.has(String(profile.Island))) throw new ProfileApiError(400, "Unknown island")

  if (fields.includes("Zones") && profile.Zones !== undefined) {
    if (!isPlainRecord(profile.Zones) || Object.values(profile.Zones).some((value) => typeof value !== "boolean")) throw new ProfileApiError(400, "Zones values must be booleans")
  }
  if (fields.includes("Owned") && profile.Owned !== undefined) {
    if (!isPlainRecord(profile.Owned) || Object.values(profile.Owned).some((value) => typeof value !== "boolean")) throw new ProfileApiError(400, "Owned values must be booleans")
  }
  if (fields.includes("Equipped") && profile.Equipped !== undefined) {
    if (!isPlainRecord(profile.Equipped)) throw new ProfileApiError(400, "Equipped must be an object")
    for (const [slot, gearId] of Object.entries(profile.Equipped)) {
      if (typeof gearId !== "string") throw new ProfileApiError(400, `Invalid equipped gear for ${slot}`)
      const options = GEAR_BY_SLOT[slot as keyof typeof GEAR_BY_SLOT]
      if (options && gearId !== "" && !options.some(([id]) => id === gearId)) throw new ProfileApiError(400, `Invalid equipped gear for ${slot}`)
    }
  }
  if (fields.includes("Backpack") && profile.Backpack !== undefined) {
    if (!isPlainRecord(profile.Backpack)) throw new ProfileApiError(400, "Backpack must be an object")
    const baseBackpack = isPlainRecord(baseData.Backpack) ? baseData.Backpack : {}
    for (const [key, count] of Object.entries(profile.Backpack)) {
      const [itemId, variant = ""] = key.split("|")
      if ((!FIND_IDS.has(itemId) || (variant && !VARIANTS.includes(variant as typeof VARIANTS[number]))) && sameValue(baseBackpack[key], count)) continue
      if (!FIND_IDS.has(itemId) || (variant && !VARIANTS.includes(variant as typeof VARIANTS[number])) || !Number.isSafeInteger(count) || Number(count) < 1) throw new ProfileApiError(400, `Invalid backpack stack: ${key}`)
    }
  }
  if (fields.includes("Potions") && profile.Potions !== undefined) {
    if (!isPlainRecord(profile.Potions)) throw new ProfileApiError(400, "Potions must be an object")
    const basePotions = isPlainRecord(baseData.Potions) ? baseData.Potions : {}
    for (const [id, seconds] of Object.entries(profile.Potions)) {
      if (!BREW_IDS.has(id) && sameValue(basePotions[id], seconds)) continue
      if (!BREW_IDS.has(id) || !Number.isSafeInteger(seconds) || Number(seconds) < 0 || Number(seconds) > 3600) throw new ProfileApiError(400, "Potions must contain known brews with 0–3600 seconds remaining")
    }
  }
  if (fields.includes("Vaults") && profile.Vaults !== undefined) {
    if (!isPlainRecord(profile.Vaults)) throw new ProfileApiError(400, "Vaults must be an object")
    const baseVaults = isPlainRecord(baseData.Vaults) ? baseData.Vaults : {}
    for (const [id, value] of Object.entries(profile.Vaults)) {
      if (!SECRET_SITES.some((site) => site.id === id) && sameValue(baseVaults[id], value)) continue
      if (!SECRET_SITES.some((site) => site.id === id) || !isPlainRecord(value) || typeof value.found !== "boolean") throw new ProfileApiError(400, "Vaults contains an invalid secret site")
    }
  }
}

async function withLimit<T, R>(items: T[], limit: number, callback: (item: T) => Promise<R>) {
  const output: R[] = []
  let nextIndex = 0
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++
      output[index] = await callback(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return output
}

async function getLiveIds(projectId: string) {
  const live = await getLivePlayers(projectId)
  return new Set(live.map((player: Record<string, unknown>) => String(player.user_id)))
}

async function getProfileSummary(project: { universe_id: string; api_key: string }, userId: string, liveIds: Set<string>) {
  const entry = await getVersionedDatastoreEntry<Record<string, unknown>>(project.universe_id, PROFILE_STORE, "global", `u_${userId}`, project.api_key)
  if (!entry.data) return null
  const profile = entry.data
  return {
    userId,
    level: Number.isFinite(profile.Level) ? profile.Level : null,
    cash: Number.isFinite(profile.Cash) ? profile.Cash : null,
    island: typeof profile.Island === "string" ? profile.Island : null,
    updatedAt: entry.updatedAt,
    version: entry.version,
    online: isOnline(userId, profile, liveIds),
  }
}

async function getCachedNameMap(ids: string[]) {
  const profiles = await getRobloxProfiles(ids)
  return profiles
}

async function getRobloxUsernameSearch(query: string) {
  if (/^\d{1,20}$/.test(query)) return query
  return resolveRobloxUsername(query)
}

async function logProfileWrite(projectId: string, userId: string, userName: string, action: string, target: string, payload: unknown) {
  await addActionLog(projectId, userId, userName, action, JSON.stringify({ who: userName, what: action, target, payload }))
}

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get("projectId")
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })
    const context = await getProjectContext(projectId)
    if ("error" in context) return context.error
    const { project } = context
    const action = request.nextUrl.searchParams.get("action") ?? "list"
    const userId = request.nextUrl.searchParams.get("userId") ?? ""

    if (action === "profile") {
      if (!/^\d{1,20}$/.test(userId)) return NextResponse.json({ error: "Valid userId required" }, { status: 400 })
      const [entry, liveIds, nameMap, grantsEntry] = await Promise.all([
        getVersionedDatastoreEntry<Record<string, unknown>>(project.universe_id, PROFILE_STORE, "global", `u_${userId}`, project.api_key),
        getLiveIds(projectId),
        getCachedNameMap([userId]),
        getVersionedDatastoreEntry<Record<string, unknown>>(project.universe_id, CONTROL_STORE, "global", `grants_${userId}`, project.api_key),
      ])
      if (!entry.data) return NextResponse.json({ error: "Player profile not found" }, { status: 404 })
      const name = nameMap.get(userId)
      const profile = entry.data
      const versions = await listDatastoreEntryVersions(project.universe_id, PROFILE_STORE, "global", `u_${userId}`, project.api_key).catch(() => ({ versions: [], nextPageCursor: null }))
      return NextResponse.json({
        user: name ?? { userId, username: userId, displayName: userId, avatarUrl: null },
        data: profile,
        version: entry.version,
        updatedAt: entry.updatedAt,
        online: isOnline(userId, profile, liveIds),
        pendingGrants: Array.isArray(grantsEntry.data?.grants) ? grantsEntry.data.grants : [],
        versions: versions.versions,
      })
    }

    if (action === "versions") {
      if (!/^\d{1,20}$/.test(userId)) return NextResponse.json({ error: "Valid userId required" }, { status: 400 })
      const result = await listDatastoreEntryVersions(project.universe_id, PROFILE_STORE, "global", `u_${userId}`, project.api_key)
      return NextResponse.json(result)
    }

    const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined
    const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 64)
    const livePlayers = await getLivePlayers(projectId)
    const liveIds = new Set(livePlayers.map((player: Record<string, unknown>) => String(player.user_id)))
    let ids: string[] = []
    let nextPageCursor: string | null = null

    if (query) {
      const matches = await searchCachedRobloxProfiles(query, [...liveIds])
      ids = matches.map((item) => item.userId)
      if (ids.length === 0) {
        const matchedId = await getRobloxUsernameSearch(query).catch(() => null)
        if (matchedId) ids = [matchedId]
      }
    } else {
      const result = await listDatastoreKeys(project.universe_id, PROFILE_STORE, "global", project.api_key, cursor, "u_", 25)
      ids = result.keys.map((item) => item.key.match(/^u_(\d{1,20})$/)?.[1]).filter((id): id is string => Boolean(id))
      nextPageCursor = result.nextPageCursor
    }

    const names = await getCachedNameMap(ids)
    const summaries = await withLimit(ids, 5, async (id) => {
      try {
        const summary = await getProfileSummary(project, id, liveIds)
        if (!summary) return null
        const name = names.get(id)
        return {
          ...summary,
          username: name?.username ?? livePlayers.find((player: Record<string, unknown>) => String(player.user_id) === id)?.username ?? id,
          displayName: name?.displayName ?? livePlayers.find((player: Record<string, unknown>) => String(player.user_id) === id)?.display_name ?? id,
          avatarUrl: name?.avatarUrl ?? livePlayers.find((player: Record<string, unknown>) => String(player.user_id) === id)?.avatar_url ?? null,
        }
      } catch {
        return null
      }
    })

    return NextResponse.json({ players: summaries.filter(Boolean), nextPageCursor })
  } catch (error) {
    return responseForError(error)
  }
}

const grantSchema = z.object({
  type: z.enum(["cash", "set_cash", "xp", "level", "island", "brew", "gear", "find"]),
  amount: z.number().int().optional(),
  level: z.number().int().optional(),
  island: z.string().optional(),
  brew: z.string().optional(),
  minutes: z.number().int().optional(),
  item: z.string().optional(),
  equip: z.boolean().optional(),
  count: z.number().int().optional(),
  variant: z.string().optional(),
  note: z.string().max(180).optional(),
})

const profileWriteSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save-profile"), projectId: z.string().min(1), userId: z.string().regex(/^\d{1,20}$/), expectedVersion: z.string().nullable(), baseData: profileObjectSchema, data: profileObjectSchema }),
  z.object({ action: z.literal("restore"), projectId: z.string().min(1), userId: z.string().regex(/^\d{1,20}$/), versionId: z.string().min(1).max(256) }),
  z.object({ action: z.literal("grant"), projectId: z.string().min(1), userId: z.string().regex(/^\d{1,20}$/), requestId: z.string().uuid(), grant: grantSchema }),
  z.object({ action: z.literal("cancel-grant"), projectId: z.string().min(1), userId: z.string().regex(/^\d{1,20}$/), grantId: z.string().uuid() }),
])

function validateGrant(input: z.infer<typeof grantSchema>) {
  switch (input.type) {
    case "cash":
      if (!Number.isSafeInteger(input.amount) || input.amount === 0 || Math.abs(input.amount ?? 0) > 1_000_000_000) throw new ProfileApiError(400, "Cash change must be a non-zero integer within 1 billion")
      return { type: input.type, amount: input.amount }
    case "set_cash":
      if (!Number.isSafeInteger(input.amount) || (input.amount ?? -1) < 0 || (input.amount ?? 0) > 1_000_000_000) throw new ProfileApiError(400, "Cash must be an integer from 0 to 1 billion")
      return { type: input.type, amount: input.amount }
    case "xp":
      if (!Number.isSafeInteger(input.amount) || (input.amount ?? 0) <= 0 || (input.amount ?? 0) > 1_000_000_000) throw new ProfileApiError(400, "XP must be a positive integer")
      return { type: input.type, amount: input.amount }
    case "level":
      if (!Number.isSafeInteger(input.level) || (input.level ?? 0) < 1 || (input.level ?? 0) > 999) throw new ProfileApiError(400, "Level must be between 1 and 999")
      return { type: input.type, level: input.level }
    case "island":
      if (!input.island || !ISLAND_IDS.has(input.island)) throw new ProfileApiError(400, "Select a valid island")
      return { type: input.type, island: input.island }
    case "brew":
      if (!input.brew || !BREW_IDS.has(input.brew) || !Number.isSafeInteger(input.minutes) || (input.minutes ?? 0) < 1 || (input.minutes ?? 0) > 60) throw new ProfileApiError(400, "Choose a valid brew and duration from 1 to 60 minutes")
      return { type: input.type, brew: input.brew, minutes: input.minutes }
    case "gear":
      if (!input.item || !GEAR_IDS.has(input.item)) throw new ProfileApiError(400, "Choose a valid gear item")
      return { type: input.type, item: input.item, equip: input.equip ?? false }
    case "find":
      if (!input.item || !FIND_IDS.has(input.item) || !Number.isSafeInteger(input.count) || (input.count ?? 0) < 1 || (input.count ?? 0) > 1000 || (input.variant && !VARIANTS.includes(input.variant as typeof VARIANTS[number]))) throw new ProfileApiError(400, "Choose a valid find, count from 1 to 1,000, and variant")
      return { type: input.type, item: input.item, count: input.count, variant: input.variant ?? "" }
  }
}

async function checkPlayerOffline(projectId: string, project: { universe_id: string; api_key: string }, userId: string) {
  const [liveIds, entry] = await Promise.all([
    getLiveIds(projectId),
    getVersionedDatastoreEntry<Record<string, unknown>>(project.universe_id, PROFILE_STORE, "global", `u_${userId}`, project.api_key),
  ])
  if (!entry.data) throw new ProfileApiError(404, "Player profile not found")
  if (isOnline(userId, entry.data, liveIds)) throw new ProfileApiError(409, "Player is online. Use a grant instead of saving their profile directly.")
  return entry
}

async function saveProfileChanges(
  project: { universe_id: string; api_key: string },
  userId: string,
  expectedVersion: string | null,
  baseData: Record<string, unknown>,
  submittedData: Record<string, unknown>,
) {
  const changedKeys = [...new Set([...Object.keys(baseData), ...Object.keys(submittedData)])]
    .filter((key) => !sameValue(baseData[key], submittedData[key]))
  for (const field of READ_ONLY_FIELDS) {
    if (changedKeys.includes(field)) throw new ProfileApiError(400, `${field} is read-only`)
  }
  validateProfile(submittedData, changedKeys, baseData)

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await getVersionedDatastoreEntry<Record<string, unknown>>(project.universe_id, PROFILE_STORE, "global", `u_${userId}`, project.api_key)
    if (!current.data) throw new ProfileApiError(404, "Player profile not found")
    const conflicts = current.version !== expectedVersion
      ? changedKeys.filter((key) => !sameValue(current.data?.[key], baseData[key]))
      : []
    if (conflicts.length > 0) throw new ProfileConflictError(conflicts)

    const next = { ...current.data }
    for (const key of changedKeys) {
      if (Object.prototype.hasOwnProperty.call(submittedData, key)) next[key] = submittedData[key]
      else delete next[key]
    }
    validateProfile(next, changedKeys, baseData)

    try {
      await setVersionedDatastoreEntry(project.universe_id, PROFILE_STORE, "global", `u_${userId}`, next, project.api_key, current.version)
      return { changedKeys, data: next }
    } catch (error) {
      if (!(error instanceof DatastoreConflictError) || attempt === 1) throw error
      expectedVersion = current.version
    }
  }
  throw new DatastoreConflictError()
}

async function updatePendingGrants(
  project: { universe_id: string; api_key: string },
  userId: string,
  change: (grants: Record<string, unknown>[]) => Record<string, unknown>[],
) {
  const key = `grants_${userId}`
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await getVersionedDatastoreEntry<Record<string, unknown>>(project.universe_id, CONTROL_STORE, "global", key, project.api_key)
    const grants = Array.isArray(current.data?.grants) ? current.data.grants.filter(isPlainRecord) : []
    const next = { ...(current.data ?? {}), grants: change(grants) }
    try {
      await setVersionedDatastoreEntry(project.universe_id, CONTROL_STORE, "global", key, next, project.api_key, current.version)
      return next.grants as Record<string, unknown>[]
    } catch (error) {
      if (!(error instanceof DatastoreConflictError) || attempt === 1) throw error
    }
  }
  throw new DatastoreConflictError()
}

export async function POST(request: NextRequest) {
  try {
    const parsed = profileWriteSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 })
    const input = parsed.data
    const context = await getProjectContext(input.projectId)
    if ("error" in context) return context.error
    const { project, session } = context

    if (input.action === "save-profile") {
      const current = await checkPlayerOffline(input.projectId, project, input.userId)
      const saved = await saveProfileChanges(project, input.userId, input.expectedVersion, input.baseData, input.data)
      await logProfileWrite(input.projectId, session.userId, session.displayName, "profile-save", input.userId, { changedKeys: saved.changedKeys, payload: Object.fromEntries(saved.changedKeys.map((key) => [key, saved.data[key]])), previousVersion: current.version })
      return NextResponse.json({ success: true, version: (await getVersionedDatastoreEntry(project.universe_id, PROFILE_STORE, "global", `u_${input.userId}`, project.api_key)).version })
    }

    if (input.action === "restore") {
      const current = await checkPlayerOffline(input.projectId, project, input.userId)
      const previous = await getDatastoreEntryVersion(project.universe_id, PROFILE_STORE, "global", `u_${input.userId}`, input.versionId, project.api_key)
      if (!isPlainRecord(previous)) return NextResponse.json({ error: "Selected version is not a profile object" }, { status: 400 })
      await setVersionedDatastoreEntry(project.universe_id, PROFILE_STORE, "global", `u_${input.userId}`, previous, project.api_key, current.version)
      await logProfileWrite(input.projectId, session.userId, session.displayName, "profile-restore", input.userId, { versionId: input.versionId, profile: previous })
      return NextResponse.json({ success: true })
    }

    if (input.action === "grant") {
      const details = validateGrant(input.grant)
      const grant = {
        id: input.requestId,
        ...details,
        by: session.displayName,
        at: Math.floor(Date.now() / 1000),
        note: input.grant.note?.trim().slice(0, 180) ?? "",
      }
      const playerProfile = await getVersionedDatastoreEntry<Record<string, unknown>>(project.universe_id, PROFILE_STORE, "global", `u_${input.userId}`, project.api_key)
      const appliedIds = isPlainRecord(playerProfile.data?.AdminSeen) ? playerProfile.data.AdminSeen : {}
      if (Object.prototype.hasOwnProperty.call(appliedIds, grant.id)) {
        return NextResponse.json({ success: true, delivered: true, pending: false, grant })
      }
      const grants = await updatePendingGrants(project, input.userId, (current) => {
        if (current.some((item) => item.id === grant.id)) return current
        return [...current, grant]
      })
      let delivered = true
      try {
        await publishMessage(project.universe_id, "DashboardCommands", JSON.stringify({ type: "grants", userId: input.userId, issuedBy: session.displayName }), project.api_key)
      } catch {
        delivered = false
      }
      await logProfileWrite(input.projectId, session.userId, session.displayName, "player-grant", input.userId, grant)
      return NextResponse.json({ success: true, delivered, pending: grants.some((item) => item.id === grant.id), grant })
    }

    let removed = false
    await updatePendingGrants(project, input.userId, (current) => {
      removed = current.some((item) => item.id === input.grantId)
      return current.filter((item) => item.id !== input.grantId)
    })
    if (!removed) return NextResponse.json({ error: "Pending grant not found" }, { status: 404 })
    await logProfileWrite(input.projectId, session.userId, session.displayName, "player-grant-cancel", input.userId, { grantId: input.grantId })
    return NextResponse.json({ success: true })
  } catch (error) {
    return responseForError(error)
  }
}
