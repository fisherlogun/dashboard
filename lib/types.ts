// Shared TypeScript interfaces for the dashboard

export interface License {
  robloxUserId: string
  robloxDisplayName: string
  grantedBy: string
  grantedByName: string
  grantedAt: Date
  active: boolean
}

export interface Ban {
  robloxUserId: string
  robloxDisplayName: string
  bannedBy: string
  bannedByName: string
  reason: string
  privateReason: string
  duration: string // e.g. "1h", "6h", "12h", "1d", "3d", "7d", "30d", "permanent"
  durationSeconds: number | null // null = permanent
  expiresAt: Date | null // null = permanent
  createdAt: Date
  active: boolean
  serverId?: string // optional: server-specific ban
}

export interface ServerSnapshot {
  serverId: string
  placeId: string
  players: number
  maxPlayers: number
  fps: number
  ping: number
  lastSeen: Date
}

export interface MongoActionLog {
  userId: string
  userName: string
  action: string
  details: string
  ip: string
  status: "success" | "error"
  timestamp: Date
}

export interface DatastoreEntry {
  scope: string
  key: string
  data: unknown
}
