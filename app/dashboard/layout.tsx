"use client"

import { useEffect, useState } from "react"
import { Activity, LockKeyhole, Waves } from "lucide-react"
import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { useSession } from "@/components/session-provider"

const routeTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/servers": "Live servers",
  "/dashboard/players": "Players",
  "/dashboard/commands": "Announcements",
  "/dashboard/events": "Event schedule",
  "/dashboard/logs": "Activity log",
  "/dashboard/settings": "Private settings",
}

function LocalClock() {
  const [time, setTime] = useState("")

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
    update()
    const interval = window.setInterval(update, 30_000)
    return () => window.clearInterval(interval)
  }, [])

  return <span className="font-mono text-xs tabular-nums text-muted-foreground">{time || "--:--"}</span>
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const title = routeTitles[pathname] ?? "Game operations"
  const { activeProject } = useSession()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-transparent">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/70 bg-background/90 px-3 backdrop-blur-xl sm:gap-4 sm:px-6">
          <SidebarTrigger aria-label="Toggle navigation" className="text-muted-foreground hover:text-foreground" />
          <Separator orientation="vertical" className="h-7" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Scuba Ops <span className="px-1.5 text-border">/</span><span className="text-foreground">{title}</span>
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{activeProject?.name ?? "Scuba Simulator"} <span className="px-1 text-border">·</span> owner control room</p>
          </div>
          <div className="hidden items-center gap-2 border border-border/80 bg-card/60 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground sm:flex">
            <Activity aria-hidden="true" className="size-3 text-primary" /> Private relay
          </div>
          <div className="flex items-center gap-2 border border-primary/25 bg-primary/5 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
            <LockKeyhole aria-hidden="true" className="size-3" />
            <span className="hidden sm:inline">Owner session</span>
            <span className="sm:hidden">Private</span>
          </div>
          <div className="hidden flex-col items-end sm:flex">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Local time</span>
            <LocalClock />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        <footer className="flex min-h-10 items-center justify-between border-t border-border/60 px-4 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground sm:px-6">
          <span className="inline-flex items-center gap-2"><Waves aria-hidden="true" className="size-3 text-primary/75" /> Scuba Simulator <span className="text-border">//</span> private operations</span>
          <span>Owner-only access</span>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}
