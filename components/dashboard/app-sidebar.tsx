"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  CalendarClock,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Server,
  Settings2,
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
  { href: "/dashboard", label: "Overview", key: "O", icon: LayoutDashboard },
  { href: "/dashboard/events", label: "Events", key: "E", icon: CalendarClock },
  { href: "/dashboard/servers", label: "Live servers", key: "S", icon: Server },
  { href: "/dashboard/players", label: "Players", key: "P", icon: Users },
  { href: "/dashboard/commands", label: "Announcements", key: "A", icon: Megaphone },
  { href: "/dashboard/logs", label: "Activity log", key: "L", icon: Activity },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { activeProject, user, logout } = useSession()

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-3 border border-sidebar-border/70 bg-gradient-to-br from-sidebar-accent/70 to-transparent px-3 py-3">
          <div className="flex size-9 shrink-0 items-center justify-center border border-primary/20 bg-primary/10 text-primary shadow-[0_0_22px_rgba(115,209,191,.08)]">
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
          <SidebarGroupLabel className="px-2 font-mono text-[9px] uppercase tracking-[0.2em] text-sidebar-foreground/45">Operations</SidebarGroupLabel>
          <SidebarMenu>
            {navigation.map(({ href, label, key, icon: Icon }) => {
              const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`))
              return (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={label} className="h-10 text-[13px] data-[active=true]:border-l-2 data-[active=true]:border-l-sidebar-primary data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-primary">
                    <Link href={href} aria-current={isActive ? "page" : undefined}>
                      <Icon aria-hidden="true" />
                      <span className="flex-1 uppercase">{label}</span>
                      <kbd className="hidden border border-sidebar-border bg-background/70 px-1 text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden sm:inline-flex">{key}</kbd>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator className="mx-2 w-auto" />

        <SidebarGroup>
          <SidebarGroupLabel className="px-2 font-mono text-[9px] uppercase tracking-[0.2em] text-sidebar-foreground/45">Workspace</SidebarGroupLabel>
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
        <div className="border border-sidebar-border/70 bg-sidebar-accent/25 p-3 group-data-[collapsible=icon]:hidden">
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
