"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "@/components/session-provider"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  BarChart3,
  Terminal,
  ScrollText,
  Settings,
  Server,
  ShieldBan,
  Users,
  KeyRound,
  Activity,
  ChevronDown,
  LogOut,
  Plus,
  Radio,
} from "lucide-react"
import { cn } from "@/lib/utils"

const mainNav = [
  { title: "OVERVIEW", url: "/dashboard", icon: BarChart3 },
  { title: "SERVERS", url: "/dashboard/servers", icon: Server },
  { title: "PLAYERS", url: "/dashboard/players", icon: Users },
  { title: "COMMANDS", url: "/dashboard/commands", icon: Terminal },
]

const managementNav = [
  { title: "BANS", url: "/dashboard/bans", icon: ShieldBan },
  { title: "LOGS", url: "/dashboard/logs", icon: ScrollText },
  { title: "SETTINGS", url: "/dashboard/settings", icon: Settings },
]

const adminNav = [
  { title: "LICENSES", url: "/dashboard/admin", icon: KeyRound },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user, projects, activeProject, setActiveProject, logout } = useSession()

  const isActive = (url: string) =>
    url === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(url)

  return (
    <Sidebar className="border-r border-border bg-sidebar">
      <SidebarHeader className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center border border-primary/50 bg-primary/10">
            <Radio className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-xs font-bold tracking-widest text-primary">NEXUS</span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Control Center</span>
          </div>
        </div>
      </SidebarHeader>

      {/* Project Switcher */}
      <div className="border-b border-border px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left hover:bg-accent transition-colors border border-transparent hover:border-border">
              <div className="flex items-center gap-2 min-w-0">
                <div className={cn("h-2 w-2 shrink-0", activeProject ? "bg-success led-pulse" : "bg-muted-foreground")} />
                <span className="font-mono text-xs truncate text-foreground">
                  {activeProject?.name ?? "NO PROJECT"}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {projects.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onClick={() => setActiveProject(p)}
                className="font-mono text-xs"
              >
                <div className="flex items-center gap-2 w-full">
                  <div className={cn("h-1.5 w-1.5 shrink-0", p.id === activeProject?.id ? "bg-success" : "bg-muted-foreground")} />
                  <span className="truncate">{p.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground uppercase">{p.role}</span>
                </div>
              </DropdownMenuItem>
            ))}
            {projects.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem asChild className="font-mono text-xs">
              <Link href="/dashboard/settings?tab=projects">
                <Plus className="mr-2 h-3 w-3" />
                New Project
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[10px] tracking-widest text-muted-foreground/60 px-4">
            OPERATIONS
          </SidebarGroupLabel>
          <SidebarMenu>
            {mainNav.map((item) => {
              const active = isActive(item.url)
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={active}>
                    <Link
                      href={item.url}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2 font-mono text-xs tracking-wide transition-colors",
                        active
                          ? "bg-accent border-l-2 border-l-primary text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      {item.title}
                      {active && <Activity className="ml-auto h-3 w-3 text-primary led-pulse" />}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[10px] tracking-widest text-muted-foreground/60 px-4">
            MANAGEMENT
          </SidebarGroupLabel>
          <SidebarMenu>
            {managementNav.map((item) => {
              const active = isActive(item.url)
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={active}>
                    <Link
                      href={item.url}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2 font-mono text-xs tracking-wide transition-colors",
                        active
                          ? "bg-accent border-l-2 border-l-primary text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      {item.title}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        {user?.isGlobalAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="font-mono text-[10px] tracking-widest text-muted-foreground/60 px-4">
              ADMIN
            </SidebarGroupLabel>
            <SidebarMenu>
              {adminNav.map((item) => {
                const active = isActive(item.url)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link
                        href={item.url}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2 font-mono text-xs tracking-wide transition-colors",
                          active
                            ? "bg-accent border-l-2 border-l-primary text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        )}
                      >
                        <item.icon className="h-3.5 w-3.5" />
                        {item.title}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border px-3 py-3">
        {user && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={user.avatarUrl}
                alt=""
                className="h-7 w-7 border border-border"
              />
              <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 bg-success border border-sidebar led-pulse" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-mono text-xs truncate text-foreground">{user.displayName}</span>
              <span className="font-mono text-[10px] text-muted-foreground truncate">{user.userId}</span>
            </div>
            <button
              onClick={logout}
              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
              title="Logout"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
