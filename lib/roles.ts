// Role-Based Access Controls

export type Role = "owner" | "admin" | "moderator"

export type Permission =
  | "view_stats"
  | "execute_kick"
  | "execute_ban"
  | "execute_warn"
  | "execute_announce"
  | "view_logs"
  | "view_own_logs"
  | "manage_roles"
  | "manage_api_key"
  | "manage_config"
  | "manage_bans"
  | "manage_datastores"

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    "view_stats",
    "execute_kick",
    "execute_ban",
    "execute_warn",
    "execute_announce",
    "view_logs",
    "view_own_logs",
    "manage_roles",
    "manage_api_key",
    "manage_config",
    "manage_bans",
    "manage_datastores",
  ],
  admin: [
    "view_stats",
    "execute_kick",
    "execute_ban",
    "execute_warn",
    "execute_announce",
    "view_logs",
    "view_own_logs",
    "manage_bans",
  ],
  moderator: [
    "view_stats",
    "execute_kick",
    "execute_warn",
    "execute_announce",
    "view_own_logs",
  ],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

export function getRoleLabel(role: Role): string {
  switch (role) {
    case "owner":
      return "Owner"
    case "admin":
      return "Admin"
    case "moderator":
      return "Moderator"
    default:
      return "Unknown"
  }
}

export function getRoleColor(role: Role): string {
  switch (role) {
    case "owner":
      return "text-chart-1"
    case "admin":
      return "text-chart-2"
    case "moderator":
      return "text-chart-4"
    default:
      return "text-muted-foreground"
  }
}
