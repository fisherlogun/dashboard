"use client"

import { useEffect, useState } from "react"
import { LockKeyhole } from "lucide-react"
import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

const routeTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/servers": "Live servers",
  "/dashboard/players": "Players",
  "/dashboard/commands": "Commands",
  "/dashboard/datastores": "Data stores",
  "/dashboard/bans": "Moderation",
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

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/70 bg-background/90 px-4 backdrop-blur-xl sm:px-6">
          <SidebarTrigger aria-label="Toggle navigation" />
          <Separator orientation="vertical" className="h-5" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight">{title}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-primary">
            <LockKeyhole aria-hidden="true" className="size-3" />
            <span className="hidden sm:inline">Owner session</span>
            <span className="sm:hidden">Private</span>
          </div>
          <LocalClock />
        </header>
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        <footer className="flex min-h-9 items-center justify-between border-t border-border/60 px-4 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground sm:px-6">
          <span>Scuba Simulator // private operations</span>
          <span>Owner-only access</span>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}
