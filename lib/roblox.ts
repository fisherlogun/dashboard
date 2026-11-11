// Roblox Open Cloud and public game APIs for the private owner console

import { createHash } from "node:crypto"

const ROBLOX_CLOUD_BASE = "https://apis.roblox.com/cloud/v2"
const ROBLOX_MESSAGING_BASE = "https://apis.roblox.com/messaging-service/v1"
const ROBLOX_BAN_BASE = "https://apis.roblox.com/cloud/v2"
const ROBLOX_GAMES_BASE = "https://games.roblox.com/v1"
const ROBLOX_THUMBNAILS_BASE = "https://thumbnails.roblox.com/v1"
const ROBLOX_DATASTORE_BASE = "https://apis.roblox.com/datastores/v1"

// ---------- Open Cloud APIs ----------

export async function getUniverseInfo(
  universeId: string,
  apiKey: string
): Promise<{ path: string; displayName: string; createTime: string }> {
  const res = await fetch(
    `${ROBLOX_CLOUD_BASE}/universes/${universeId}`,
    { headers: { "x-api-key": apiKey } }
  )
  if (!res.ok) {
    throw new Error(`Universe info failed: ${res.status}`)
  }
  return res.json()
}

export async function publishMessage(
  universeId: string,
  topic: string,
  message: string,
  apiKey: string
): Promise<void> {
  if (Buffer.byteLength(message, "utf8") > 1000) {
    throw new Error("Roblox MessagingService messages must be under 1 KB")
  }

  const res = await fetch(
    `${ROBLOX_MESSAGING_BASE}/universes/${universeId}/topics/${encodeURIComponent(topic)}`,
    {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Publish message failed: ${res.status} ${text}`)
  }
}

// ---------- Legacy Game Stats APIs ----------

export interface GameStats {
  id: number
  rootPlaceId: number
  name: string
  description: string
  playing: number
  visits: number
  maxPlayers: number
  created: string
  updated: string
  favoritedCount: number
}

export async function getGameStats(
  universeId: string
): Promise<GameStats | null> {
  const res = await fetch(
    `${ROBLOX_GAMES_BASE}/games?universeIds=${universeId}`
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.data?.[0] ?? null
}

export interface GameVotes {
  id: number
  upVotes: number
  downVotes: number
}

export async function getGameVotes(
  universeId: string
): Promise<GameVotes | null> {
  const res = await fetch(
    `${ROBLOX_GAMES_BASE}/games/votes?universeIds=${universeId}`
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.data?.[0] ?? null
}

export async function getFavoriteCount(
  universeId: string
): Promise<number> {
  const res = await fetch(
    `${ROBLOX_GAMES_BASE}/games/${universeId}/favorites/count`
  )
  if (!res.ok) return 0
  const data = await res.json()
  return data.favoritesCount ?? 0
}

export interface ServerInfo {
  id: string
  maxPlayers: number
  playing: number
  playerTokens: string[]
  fps: number
  ping: number
}

export async function getServers(
  placeId: string,
  cursor?: string
): Promise<{ data: ServerInfo[]; nextPageCursor: string | null }> {
  const url = new URL(
    `${ROBLOX_GAMES_BASE}/games/${placeId}/servers/0`
  )
  url.searchParams.set("sortOrder", "Desc")
  url.searchParams.set("limit", "100")
  if (cursor) url.searchParams.set("cursor", cursor)

  const res = await fetch(url.toString())
  if (!res.ok) return { data: [], nextPageCursor: null }
  const json = await res.json()
  return {
    data: json.data ?? [],
    nextPageCursor: json.nextPageCursor ?? null,
  }
}

export async function getGameThumbnail(
  universeId: string
): Promise<string | null> {
  const res = await fetch(
    `${ROBLOX_THUMBNAILS_BASE}/games/icons?universeIds=${universeId}&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false`
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.data?.[0]?.imageUrl ?? null
}

// ---------- DataStore APIs ----------

export async function getDatastoreEntry(
  universeId: string,
  datastoreName: string,
  scope: string,
  key: string,
  apiKey: string
): Promise<unknown> {
  const url = new URL(
    `${ROBLOX_DATASTORE_BASE}/universes/${universeId}/standard-datastores/datastore/entries/entry`
  )
  url.searchParams.set("datastoreName", datastoreName)
  url.searchParams.set("scope", scope || "global")
  url.searchParams.set("entryKey", key)

  const res = await fetch(url.toString(), {
    headers: { "x-api-key": apiKey },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`DataStore get failed: ${res.status} ${text}`)
  }
  return res.json()
}

export async function setDatastoreEntry(
  universeId: string,
  datastoreName: string,
  scope: string,
  key: string,
  data: unknown,
  apiKey: string
): Promise<void> {
  const url = new URL(
    `${ROBLOX_DATASTORE_BASE}/universes/${universeId}/standard-datastores/datastore/entries/entry`
  )
  url.searchParams.set("datastoreName", datastoreName)
  url.searchParams.set("scope", scope || "global")
  url.searchParams.set("entryKey", key)

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`DataStore set failed: ${res.status} ${text}`)
  }
}

export async function listDatastores(
  universeId: string,
  apiKey: string,
  cursor?: string
): Promise<{ datastores: { name: string }[]; nextPageCursor: string | null }> {
  const url = new URL(
    `${ROBLOX_DATASTORE_BASE}/universes/${universeId}/standard-datastores`
  )
  url.searchParams.set("limit", "50")
  if (cursor) url.searchParams.set("cursor", cursor)

  const res = await fetch(url.toString(), {
    headers: { "x-api-key": apiKey },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`List datastores failed: ${res.status} ${text}`)
  }
  const json = await res.json()
  return {
    datastores: json.datastores ?? [],
    nextPageCursor: json.nextPageCursor ?? null,
  }
}

export async function listDatastoreKeys(
  universeId: string,
  datastoreName: string,
  scope: string,
  apiKey: string,
  cursor?: string,
  prefix?: string,
  limit = 100
): Promise<{ keys: { key: string }[]; nextPageCursor: string | null }> {
  const url = new URL(
    `${ROBLOX_DATASTORE_BASE}/universes/${universeId}/standard-datastores/datastore/entries`
  )
  url.searchParams.set("datastoreName", datastoreName)
  url.searchParams.set("scope", scope || "global")
  url.searchParams.set("limit", String(Math.max(1, Math.min(100, limit))))
  if (prefix) url.searchParams.set("prefix", prefix)
  if (cursor) url.searchParams.set("cursor", cursor)

  const res = await fetch(url.toString(), {
    headers: { "x-api-key": apiKey },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`List datastore keys failed: ${res.status} ${text}`)
  }
  const json = await res.json()
  return {
    keys: json.keys ?? [],
    nextPageCursor: json.nextPageCursor ?? null,
  }
}

// ---------- Roblox Ban API (v2 Cloud) ----------

export async function banPlayer(
  universeId: string,
  userId: string,
  displayReason: string,
  privateReason: string,
  durationSeconds: number | null,
  apiKey: string
): Promise<void> {
  const body: Record<string, unknown> = {
    gameJoinRestriction: {
      active: true,
      displayReason,
      privateReason,
      excludeAltAccounts: false,
      inherited: true,
    },
  }
  if (durationSeconds !== null) {
    (body.gameJoinRestriction as Record<string, unknown>).duration = `${durationSeconds}s`
  }

  const res = await fetch(
    `${ROBLOX_BAN_BASE}/universes/${universeId}/user-restrictions/${userId}`,
    {
      method: "PATCH",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Ban API failed: ${res.status} ${text}`)
  }
}

export async function unbanPlayer(
  universeId: string,
  userId: string,
  apiKey: string
): Promise<void> {
  const body = {
    gameJoinRestriction: {
      active: false,
    },
  }

  const res = await fetch(
    `${ROBLOX_BAN_BASE}/universes/${universeId}/user-restrictions/${userId}`,
    {
      method: "PATCH",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Unban API failed: ${res.status} ${text}`)
  }
}

// ---------- User Lookup APIs ----------

export async function getUserThumbnail(
  userId: string
): Promise<string | null> {
  const res = await fetch(
    `${ROBLOX_THUMBNAILS_BASE}/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.data?.[0]?.imageUrl ?? null
}

export interface VersionedDatastoreEntry<T = unknown> {
  data: T | null
  version: string | null
  createdAt: string | null
  updatedAt: string | null
}

export class DatastoreConflictError extends Error {
  constructor(message = "DataStore entry changed during the update") {
    super(message)
    this.name = "DatastoreConflictError"
  }
}

function datastoreEntryUrl(universeId: string, datastoreName: string, scope: string, key: string) {
  const url = new URL(`${ROBLOX_DATASTORE_BASE}/universes/${universeId}/standard-datastores/datastore/entries/entry`)
  url.searchParams.set("datastoreName", datastoreName)
  url.searchParams.set("scope", scope || "global")
  url.searchParams.set("entryKey", key)
  return url
}

export async function getVersionedDatastoreEntry<T = unknown>(
  universeId: string,
  datastoreName: string,
  scope: string,
  key: string,
  apiKey: string,
): Promise<VersionedDatastoreEntry<T>> {
  const response = await fetch(datastoreEntryUrl(universeId, datastoreName, scope, key), {
    headers: { "x-api-key": apiKey },
    cache: "no-store",
  })
  if (response.status === 404) return { data: null, version: null, createdAt: null, updatedAt: null }
  if (!response.ok) {
    throw new Error(`DataStore get failed: ${response.status} ${await response.text()}`)
  }
  const etag = response.headers.get("roblox-entry-version") ?? response.headers.get("x-roblox-entry-version") ?? response.headers.get("x-entry-version") ?? response.headers.get("etag")
  return {
    data: await response.json() as T,
    version: etag?.replace(/^\"|\"$/g, "") ?? null,
    createdAt: response.headers.get("roblox-entry-created-time") ?? response.headers.get("x-roblox-entry-created-time"),
    updatedAt: response.headers.get("roblox-entry-updated-time") ?? response.headers.get("x-roblox-entry-updated-time"),
  }
}

export async function setVersionedDatastoreEntry(
  universeId: string,
  datastoreName: string,
  scope: string,
  key: string,
  data: unknown,
  apiKey: string,
  matchVersion: string | null,
): Promise<string | null> {
  const url = datastoreEntryUrl(universeId, datastoreName, scope, key)
  if (matchVersion) url.searchParams.set("matchVersion", matchVersion)
  else url.searchParams.set("exclusiveCreate", "true")

  const body = JSON.stringify(data)
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "content-md5": createHash("md5").update(body).digest("base64"),
    },
    body,
  })
  if (response.status === 409 || response.status === 412) {
    throw new DatastoreConflictError()
  }
  if (!response.ok) {
    throw new Error(`DataStore set failed: ${response.status} ${await response.text()}`)
  }
  return response.headers.get("roblox-entry-version")?.replace(/^\"|\"$/g, "") ?? null
}

export async function listDatastoreEntryVersions(
  universeId: string,
  datastoreName: string,
  scope: string,
  key: string,
  apiKey: string,
): Promise<{ versions: Array<{ version: string; createdTime?: string; objectSizeBytes?: number }>; nextPageCursor: string | null }> {
  const url = new URL(`${ROBLOX_DATASTORE_BASE}/universes/${universeId}/standard-datastores/datastore/entries/entry/versions`)
  url.searchParams.set("datastoreName", datastoreName)
  url.searchParams.set("scope", scope || "global")
  url.searchParams.set("entryKey", key)
  url.searchParams.set("limit", "20")
  const response = await fetch(url, { headers: { "x-api-key": apiKey }, cache: "no-store" })
  if (!response.ok) throw new Error(`DataStore versions failed: ${response.status} ${await response.text()}`)
  const result = await response.json()
  const versions = (result.versions ?? []).map((version: Record<string, unknown>) => ({
    version: String(version.version ?? version.versionId ?? ""),
    createdTime: typeof version.createdTime === "string" ? version.createdTime : typeof version.createdAt === "string" ? version.createdAt : undefined,
    objectSizeBytes: typeof version.objectSizeBytes === "number" ? version.objectSizeBytes : undefined,
  })).filter((version: { version: string }) => version.version)
  return { versions, nextPageCursor: result.nextPageCursor ?? null }
}

export async function getDatastoreEntryVersion(
  universeId: string,
  datastoreName: string,
  scope: string,
  key: string,
  versionId: string,
  apiKey: string,
): Promise<unknown> {
  const url = new URL(`${ROBLOX_DATASTORE_BASE}/universes/${universeId}/standard-datastores/datastore/entries/entry/versions/version`)
  url.searchParams.set("datastoreName", datastoreName)
  url.searchParams.set("scope", scope || "global")
  url.searchParams.set("entryKey", key)
  url.searchParams.set("versionId", versionId)
  const response = await fetch(url, { headers: { "x-api-key": apiKey }, cache: "no-store" })
  if (!response.ok) throw new Error(`DataStore version read failed: ${response.status} ${await response.text()}`)
  return response.json()
}
