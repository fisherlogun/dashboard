import { sql } from "./neon"

// ---------- Users ----------

export async function upsertUser(data: {
  id: string
  displayName: string
  avatarUrl: string
  profileUrl: string
}) {
  const q = sql()
  await q`
    INSERT INTO users (id, display_name, avatar_url, profile_url, last_login)
    VALUES (${data.id}, ${data.displayName}, ${data.avatarUrl}, ${data.profileUrl}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      display_name = ${data.displayName},
      avatar_url = ${data.avatarUrl},
      profile_url = ${data.profileUrl},
      last_login = NOW()
  `
}

export async function getUser(id: string) {
  const q = sql()
  const rows = await q`SELECT * FROM users WHERE id = ${id}`
  return rows[0] ?? null
}

export async function setGlobalAdmin(userId: string, isAdmin: boolean) {
  const q = sql()
  await q`UPDATE users SET is_global_admin = ${isAdmin} WHERE id = ${userId}`
}

// ---------- Projects ----------

export async function createProject(data: {
  name: string
  universeId: string
  placeId: string
  apiKey: string
  ownerId: string
}) {
  const q = sql()
  const rows = await q`
    INSERT INTO projects (name, universe_id, place_id, api_key, owner_id)
    VALUES (${data.name}, ${data.universeId}, ${data.placeId}, ${data.apiKey}, ${data.ownerId})
    RETURNING *
  `
  // Also add the owner as a member
  if (rows[0]) {
    await q`
      INSERT INTO project_members (project_id, user_id, role)
      VALUES (${rows[0].id}, ${data.ownerId}, 'owner')
      ON CONFLICT (project_id, user_id) DO NOTHING
    `
  }
  return rows[0]
}

export async function getProject(id: string) {
  const q = sql()
  const rows = await q`SELECT * FROM projects WHERE id = ${id}`
  return rows[0] ?? null
}

export const getProjectById = getProject

export async function getProjectsForUser(userId: string) {
  const q = sql()
  return q`
    SELECT p.*, pm.role FROM projects p
    JOIN project_members pm ON pm.project_id = p.id
    WHERE pm.user_id = ${userId}
    ORDER BY p.created_at DESC
  `
}

export async function updateProject(id: string, updates: { name?: string; apiKey?: string; universeId?: string; placeId?: string }) {
  const q = sql()
  if (updates.name !== undefined) await q`UPDATE projects SET name = ${updates.name} WHERE id = ${id}`
  if (updates.apiKey !== undefined) await q`UPDATE projects SET api_key = ${updates.apiKey} WHERE id = ${id}`
  if (updates.universeId !== undefined) await q`UPDATE projects SET universe_id = ${updates.universeId} WHERE id = ${id}`
  if (updates.placeId !== undefined) await q`UPDATE projects SET place_id = ${updates.placeId} WHERE id = ${id}`
}

export async function deleteProject(id: string) {
  const q = sql()
  await q`DELETE FROM projects WHERE id = ${id}`
}

// ---------- Project Members ----------

export async function addProjectMember(projectId: string, userId: string, role: string) {
  const q = sql()
  await q`
    INSERT INTO project_members (project_id, user_id, role)
    VALUES (${projectId}, ${userId}, ${role})
    ON CONFLICT (project_id, user_id) DO UPDATE SET role = ${role}
  `
}

export async function removeProjectMember(projectId: string, userId: string) {
  const q = sql()
  await q`DELETE FROM project_members WHERE project_id = ${projectId} AND user_id = ${userId}`
}

export async function getProjectMembers(projectId: string) {
  const q = sql()
  return q`
    SELECT pm.*, u.display_name, u.avatar_url FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ${projectId}
    ORDER BY pm.added_at ASC
  `
}

export async function getMemberRole(projectId: string, userId: string): Promise<string | null> {
  const q = sql()
  const rows = await q`SELECT role FROM project_members WHERE project_id = ${projectId} AND user_id = ${userId}`
  return rows[0]?.role ?? null
}

export async function getProjectMember(projectId: string, userId: string) {
  const q = sql()
  const rows = await q`SELECT pm.*, u.display_name, u.avatar_url FROM project_members pm JOIN users u ON u.id = pm.user_id WHERE pm.project_id = ${projectId} AND pm.user_id = ${userId}`
  return rows[0] ?? null
}

export async function updateMemberRole(projectId: string, userId: string, role: string) {
  const q = sql()
  await q`UPDATE project_members SET role = ${role} WHERE project_id = ${projectId} AND user_id = ${userId}`
}

export async function removeMember(projectId: string, userId: string) {
  const q = sql()
  await q`DELETE FROM project_members WHERE project_id = ${projectId} AND user_id = ${userId}`
}

// ---------- Licenses ----------

export async function grantLicense(userId: string, grantedBy: string, grantedByName: string) {
  const q = sql()
  await q`
    INSERT INTO licenses (user_id, granted_by, granted_by_name, active)
    VALUES (${userId}, ${grantedBy}, ${grantedByName}, TRUE)
    ON CONFLICT (user_id) DO UPDATE SET active = TRUE, granted_by = ${grantedBy}, granted_by_name = ${grantedByName}, granted_at = NOW()
  `
}

export async function revokeLicense(userId: string) {
  const q = sql()
  await q`UPDATE licenses SET active = FALSE WHERE user_id = ${userId}`
}

export async function isLicensed(userId: string): Promise<boolean> {
  const q = sql()
  const rows = await q`SELECT active FROM licenses WHERE user_id = ${userId}`
  return rows[0]?.active === true
}

export async function getLicenses() {
  const q = sql()
  return q`
    SELECT l.*, u.display_name, u.avatar_url
    FROM licenses l
    LEFT JOIN users u ON u.id = l.user_id
    ORDER BY l.granted_at DESC
  `
}

// ---------- Bans ----------

export async function createBan(data: {
  projectId: string
  robloxUserId: string
  bannedBy: string
  bannedByName: string
  reason: string
  privateReason: string
  duration: string
  durationSeconds: number | null
  expiresAt: Date | null
}) {
  const q = sql()
  // Deactivate existing bans for this user in this project first
  await q`UPDATE bans SET active = FALSE WHERE project_id = ${data.projectId} AND roblox_user_id = ${data.robloxUserId} AND active = TRUE`

  return q`
    INSERT INTO bans (project_id, roblox_user_id, banned_by, banned_by_name, reason, private_reason, duration, duration_seconds, expires_at, active)
    VALUES (${data.projectId}, ${data.robloxUserId}, ${data.bannedBy}, ${data.bannedByName}, ${data.reason}, ${data.privateReason}, ${data.duration}, ${data.durationSeconds}, ${data.expiresAt?.toISOString() ?? null}, TRUE)
    RETURNING *
  `
}

export async function getBans(projectId: string) {
  const q = sql()
  return q`SELECT * FROM bans WHERE project_id = ${projectId} ORDER BY created_at DESC`
}

export async function unbanUser(banId: string) {
  const q = sql()
  await q`UPDATE bans SET active = FALSE WHERE id = ${banId}`
}

// ---------- Action Logs ----------

export async function addActionLog(projectId: string | null, userId: string, userName: string, action: string, details: string, ip = "") {
  const q = sql()
  await q`
    INSERT INTO action_logs (project_id, user_id, user_name, action, details, ip, status)
    VALUES (${projectId}, ${userId}, ${userName}, ${action}, ${details}, ${ip}, 'success')
  `
}

export async function getActionLogs(projectId: string, filterUserId?: string) {
  const q = sql()
  if (filterUserId) {
    return q`
      SELECT * FROM action_logs
      WHERE project_id = ${projectId} AND user_id = ${filterUserId}
      ORDER BY created_at DESC
      LIMIT 200
    `
  }
  return q`
    SELECT * FROM action_logs
    WHERE project_id = ${projectId}
    ORDER BY created_at DESC
    LIMIT 200
  `
}

// ---------- Live Servers (from Lua heartbeat) ----------

export async function upsertLiveServer(data: {
  id: string
  projectId: string
  placeId: string
  players: number
  maxPlayers: number
  fps: number
  ping: number
  uptime: number
}) {
  const q = sql()
  await q`
    INSERT INTO live_servers (id, project_id, place_id, players, max_players, fps, ping, uptime, last_heartbeat)
    VALUES (${data.id}, ${data.projectId}, ${data.placeId}, ${data.players}, ${data.maxPlayers}, ${data.fps}, ${data.ping}, ${data.uptime}, NOW())
    ON CONFLICT (id, project_id) DO UPDATE SET
      players = ${data.players}, max_players = ${data.maxPlayers},
      fps = ${data.fps}, ping = ${data.ping}, uptime = ${data.uptime},
      last_heartbeat = NOW()
  `
}

export async function getLiveServers(projectId: string) {
  const q = sql()
  // Only return servers that have sent a heartbeat in the last 45 seconds
  return q`
    SELECT * FROM live_servers
    WHERE project_id = ${projectId} AND last_heartbeat > NOW() - INTERVAL '45 seconds'
    ORDER BY players DESC
  `
}

export async function cleanupStaleServers() {
  const q = sql()
  await q`DELETE FROM live_servers WHERE last_heartbeat < NOW() - INTERVAL '60 seconds'`
  await q`DELETE FROM live_players WHERE last_heartbeat < NOW() - INTERVAL '60 seconds'`
}

// ---------- Live Players (from Lua heartbeat) ----------

export async function upsertLivePlayer(data: {
  userId: string
  projectId: string
  serverId: string
  displayName: string
  username: string
  playTime: number
  accountAge: number
  avatarUrl: string
}) {
  const q = sql()
  await q`
    INSERT INTO live_players (user_id, project_id, server_id, display_name, username, play_time, account_age, avatar_url, last_heartbeat)
    VALUES (${data.userId}, ${data.projectId}, ${data.serverId}, ${data.displayName}, ${data.username}, ${data.playTime}, ${data.accountAge}, ${data.avatarUrl}, NOW())
    ON CONFLICT (user_id, project_id) DO UPDATE SET
      server_id = ${data.serverId}, display_name = ${data.displayName}, username = ${data.username},
      play_time = ${data.playTime}, account_age = ${data.accountAge}, avatar_url = ${data.avatarUrl},
      last_heartbeat = NOW()
  `
}

export async function getLivePlayers(projectId: string) {
  const q = sql()
  return q`
    SELECT * FROM live_players
    WHERE project_id = ${projectId} AND last_heartbeat > NOW() - INTERVAL '45 seconds'
    ORDER BY display_name ASC
  `
}

export async function getPlayersInServer(projectId: string, serverId: string) {
  const q = sql()
  return q`
    SELECT * FROM live_players
    WHERE project_id = ${projectId} AND server_id = ${serverId} AND last_heartbeat > NOW() - INTERVAL '45 seconds'
    ORDER BY display_name ASC
  `
}

// ---------- Player History ----------

export async function addPlayerHistoryPoint(projectId: string, playerCount: number, serverCount: number) {
  const q = sql()
  await q`INSERT INTO player_history (project_id, player_count, server_count) VALUES (${projectId}, ${playerCount}, ${serverCount})`
}

export async function getPlayerHistory(projectId: string, minutes: number = 180) {
  const q = sql()
  return q`SELECT * FROM player_history WHERE project_id = ${projectId} AND recorded_at > NOW() - INTERVAL '${minutes} minutes' ORDER BY recorded_at DESC`
}

export async function cleanupOldPlayerHistory(projectId: string, keepMinutes: number = 180) {
  const q = sql()
  await q`DELETE FROM player_history WHERE project_id = ${projectId} AND recorded_at < NOW() - INTERVAL '${keepMinutes} minutes'`
}

export async function getPlayerHistory(projectId: string, limit = 60) {
  const q = sql()
  return q`
    SELECT player_count, server_count, recorded_at FROM player_history
    WHERE project_id = ${projectId}
    ORDER BY recorded_at DESC
    LIMIT ${limit}
  `
}

// ---------- Global Admin ----------

export function isGlobalAdmin(userId: string): boolean {
  const adminId = process.env.ADMIN_USER_ID
  return !!adminId && userId === adminId
}
