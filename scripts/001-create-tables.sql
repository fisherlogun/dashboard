-- Nexus Dashboard - Full Schema
-- Using Neon PostgreSQL

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  profile_url TEXT,
  is_global_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  universe_id TEXT NOT NULL,
  place_id TEXT NOT NULL,
  api_key TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','moderator')),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS licenses (
  user_id TEXT PRIMARY KEY,
  granted_by TEXT NOT NULL,
  granted_by_name TEXT NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  roblox_user_id TEXT NOT NULL,
  banned_by TEXT NOT NULL,
  banned_by_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  private_reason TEXT,
  duration TEXT,
  duration_seconds INT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  ip TEXT,
  status TEXT CHECK (status IN ('success','error')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS live_servers (
  id TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  players INT DEFAULT 0,
  max_players INT DEFAULT 0,
  fps REAL DEFAULT 60,
  ping REAL DEFAULT 0,
  uptime INT DEFAULT 0,
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, project_id)
);

CREATE TABLE IF NOT EXISTS live_players (
  user_id TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  server_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  username TEXT NOT NULL,
  join_time TIMESTAMPTZ DEFAULT NOW(),
  play_time INT DEFAULT 0,
  account_age INT DEFAULT 0,
  avatar_url TEXT,
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, project_id)
);

CREATE TABLE IF NOT EXISTS player_history (
  id SERIAL PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  player_count INT NOT NULL,
  server_count INT NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_servers_heartbeat ON live_servers(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_live_players_heartbeat ON live_players(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_player_history_project ON player_history(project_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_bans_project ON bans(project_id, active);
CREATE INDEX IF NOT EXISTS idx_action_logs_project ON action_logs(project_id, created_at DESC);
