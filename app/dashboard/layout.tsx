"use client"

import { usePathname } from "next/navigation"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { useSession } from "@/components/session-provider"
import { Clock } from "lucide-react"
import { useEffect, useState } from "react"

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "OVERVIEW",
  "/dashboard/servers": "SERVERS",
  "/dashboard/players": "PLAYERS",
  "/dashboard/commands": "COMMANDS",
  "/dashboard/bans": "BANS",
  "/dashboard/logs": "ACTIVITY LOG",
  "/dashboard/settings": "SETTINGS",
  "/dashboard/admin": "LICENSES",
}

function LiveClock() {
  const [time, setTime] = useState("")
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour12: false }))
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [])
  return (
    <span className="font-mono text-[11px] text-muted-foreground tabular-nums flex items-center gap-1.5">
      <Clock className="h-3 w-3" />
      {time}
    </span>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { activeProject } = useSession()
  const title = PAGE_TITLES[pathname] ?? "DASHBOARD"

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-10 shrink-0 items-center justify-between border-b border-border px-4 bg-card">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
            <div className="h-4 w-px bg-border" />
            <span className="font-mono text-[11px] font-bold tracking-widest text-foreground">{title}</span>
            {activeProject && (
              <>
                <div className="h-4 w-px bg-border" />
                <span className="font-mono text-[10px] text-muted-foreground">
                  {activeProject.name}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 bg-success led-pulse" />
              <span className="font-mono text-[10px] text-success">ONLINE</span>
            </div>
            <LiveClock />
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-background">
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
