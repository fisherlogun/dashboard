"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Activity,
  Ban,
  CalendarClock,
  Database,
  LayoutDashboard,
  LogOut,
  Moon,
  Server,
  Settings2,
  Sparkles,
  Sun,
  TerminalSquare,
  UserRound,
  Users,
  Waves,
} from "lucide-react"
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
  SidebarSeparator,
} from "@/components/ui/sidebar"

const navigation = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/events", label: "Events", icon: Sparkles },
  { href: "/dashboard/schedules", label: "Schedule", icon: CalendarClock },
  { href: "/dashboard/servers", label: "Live servers", icon: Server },
  { href: "/dashboard/players", label: "Players", icon: Users },
  { href: "/dashboard/profiles", label: "Player profiles", icon: UserRound },
  { href: "/dashboard/commands", label: "Commands", icon: TerminalSquare },
  { href: "/dashboard/datastores", label: "Data stores", icon: Database },
  { href: "/dashboard/bans", label: "Moderation", icon: Ban },
  { href: "/dashboard/logs", label: "Activity log", icon: Activity },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { activeProject, user, logout } = useSession()

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/40 px-3 py-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Waves aria-hidden="true" className="size-5" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold tracking-tight">SCUBA OPS</p>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Private console</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 font-mono text-[9px] uppercase tracking-[0.18em]">Game</SidebarGroupLabel>
          <SidebarMenu>
            {navigation.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`))
              return (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                    <Link href={href} aria-current={isActive ? "page" : undefined}>
                      <Icon aria-hidden="true" />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator className="mx-2 w-auto" />

        <SidebarGroup>
          <SidebarGroupLabel className="px-2 font-mono text-[9px] uppercase tracking-[0.18em]">Access</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard/settings"} tooltip="Private settings">
                <Link href="/dashboard/settings" aria-current={pathname === "/dashboard/settings" ? "page" : undefined}>
                  <Settings2 aria-hidden="true" />
                  <span>Private settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2 p-3">
        <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/30 p-3 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-primary">Owner verified</span>
          </div>
          <p className="mt-2 truncate text-xs font-medium">{activeProject?.name ?? "Scuba Simulator"}</p>
          <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
            {activeProject ? `PLACE ${activeProject.place_id}` : "GAME LINK PENDING"}
          </p>
        </div>

        <div className="flex items-center justify-between gap-1">
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-xs font-medium">{user?.displayName ?? "Owner"}</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Single-owner access</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              aria-label={theme === "dark" ? "Switch to light appearance" : "Switch to dark appearance"}
              title={theme === "dark" ? "Light appearance" : "Dark appearance"}
            >
              {theme === "dark" ? <Sun aria-hidden="true" className="size-4" /> : <Moon aria-hidden="true" className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
