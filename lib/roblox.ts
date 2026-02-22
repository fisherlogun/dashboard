// Roblox API client for Open Cloud and legacy web APIsa

const ROBLOX_OAUTH_BASE = "https://apis.roblox.com/oauth/v1"
const ROBLOX_CLOUD_BASE = "https://apis.roblox.com/cloud/v2"
const ROBLOX_GAMES_BASE = "https://games.roblox.com/v1"
const ROBLOX_THUMBNAILS_BASE = "https://thumbnails.roblox.com/v1"
const ROBLOX_DATASTORE_BASE = "https://apis.roblox.com/datastores/v1"

// ---------- OAuth ----------

export interface RobloxTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  id_token: string
  scope: string
}

export interface RobloxUserInfo {
  sub: string
  name: string
  nickname: string
  preferred_username: string
  profile: string
  picture: string
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<RobloxTokenResponse> {
  const res = await fetch(`${ROBLOX_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.ROBLOX_CLIENT_ID!,
      client_secret: process.env.ROBLOX_CLIENT_SECRET!,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token exchange failed: ${res.status} ${text}`)
  }
  return res.json()
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<RobloxTokenResponse> {
  const res = await fetch(`${ROBLOX_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.ROBLOX_CLIENT_ID!,
      client_secret: process.env.ROBLOX_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status}`)
  }
  return res.json()
}

export async function getUserInfo(
  accessToken: string
): Promise<RobloxUserInfo> {
  const res = await fetch(`${ROBLOX_OAUTH_BASE}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    throw new Error(`User info failed: ${res.status}`)
  }
  return res.json()
}

export async function revokeToken(token: string): Promise<void> {
  await fetch(`${ROBLOX_OAUTH_BASE}/token/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.ROBLOX_CLIENT_ID!,
      client_secret: process.env.ROBLOX_CLIENT_SECRET!,
      token,
    }),
  })
}

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
  const res = await fetch(
    `${ROBLOX_CLOUD_BASE}/universes/${universeId}/topics/${topic}:publish`,
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
