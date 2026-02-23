// In-memory mock database layeraa
// Easily replaceable with a real database (Supabase, Neon, etc.)

export interface AppConfig {
  apiKey: string // encrypted in a real implementation
  universeId: string
  placeId: string
  gameName: string
  ownerId: string
  pollingInterval: number // seconds
}

export interface UserRole {
  userId: string
  displayName: string
  role: "owner" | "admin" | "moderator"
}

export interface ActionLog {
  id: string
  userId: string
  userName: string
  action: string
  details: string
  ip: string
  timestamp: Date
  status: "success" | "error"
}

// ---------- Ban Entry ----------

export interface BanEntry {
  id: string
  robloxUserId: string
  bannedBy: string
  bannedByName: string
  reason: string
  privateReason: string
  duration: string
  durationSeconds: number | null
  expiresAt: Date | null
  createdAt: Date
  active: boolean
}

// In-memory stores
let config: AppConfig | null = null
const userRoles: Map<string, UserRole> = new Map()
const actionLogs: ActionLog[] = []
const playerHistory: { timestamp: Date; players: number }[] = []
const bans: Map<string, BanEntry> = new Map()

// ---------- Config ----------

export function getConfig(): AppConfig | null {
  return config
}

export function saveConfig(data: AppConfig): void {
  config = data
}

export function updateConfig(updates: Partial<AppConfig>): void {
  if (config) {
    config = { ...config, ...updates }
  }
}

export function isSetupComplete(): boolean {
  return config !== null
}

// ---------- Roles ----------

export function getUserRole(userId: string): UserRole | undefined {
  return userRoles.get(userId)
}

export function setUserRole(role: UserRole): void {
  userRoles.set(role.userId, role)
}

export function getAllRoles(): UserRole[] {
  return Array.from(userRoles.values())
}

export function removeUserRole(userId: string): void {
  userRoles.delete(userId)
}

// ---------- Action Logs ----------

export function addActionLog(
  log: Omit<ActionLog, "id" | "timestamp">
): ActionLog {
  const entry: ActionLog = {
    ...log,
    id: crypto.randomUUID(),
    timestamp: new Date(),
  }
  actionLogs.unshift(entry)
  // Keep last 1000 logs
  if (actionLogs.length > 1000) {
    actionLogs.pop()
  }
  return entry
}

export function getActionLogs(options?: {
  limit?: number
  offset?: number
  action?: string
  userId?: string
  status?: "success" | "error"
}): { logs: ActionLog[]; total: number } {
  let filtered = actionLogs

  if (options?.action) {
    filtered = filtered.filter((l) =>
      l.action.toLowerCase().includes(options.action!.toLowerCase())
    )
  }
  if (options?.userId) {
    filtered = filtered.filter((l) => l.userId === options.userId)
  }
  if (options?.status) {
    filtered = filtered.filter((l) => l.status === options.status)
  }

  const total = filtered.length
  const offset = options?.offset ?? 0
  const limit = options?.limit ?? 50
  const logs = filtered.slice(offset, offset + limit)

  return { logs, total }
}

// ---------- Player History ----------

export function addPlayerHistoryPoint(players: number): void {
  playerHistory.push({ timestamp: new Date(), players })
  // Keep last 60 data points (30 minutes at 30s intervals)
  if (playerHistory.length > 60) {
    playerHistory.shift()
  }
}

export function getPlayerHistory(): { timestamp: Date; players: number }[] {
  return [...playerHistory]
}

// ---------- Bans ----------

export function addBan(ban: Omit<BanEntry, "id">): BanEntry {
  const entry: BanEntry = {
    ...ban,
    id: crypto.randomUUID(),
  }
  bans.set(ban.robloxUserId, entry)
  return entry
}

export function getBans(): BanEntry[] {
  return Array.from(bans.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )
}

export function unbanUser(robloxUserId: string): void {
  const ban = bans.get(robloxUserId)
  if (ban) {
    ban.active = false
    bans.set(robloxUserId, ban)
  }
}
