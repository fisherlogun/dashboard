"use client"

import { CalendarDays, Radio } from "lucide-react"
import { EventsManager } from "@/components/dashboard/events-manager"
import { ScheduleManager } from "@/components/dashboard/schedule-manager"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function EventsHub() {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Scuba Simulator · Operations</p>
        <h1 className="font-serif text-3xl font-bold">Events</h1>
        <p className="mt-2 max-w-2xl text-[13px] text-muted-foreground">Manage live activity and plan what happens next from one place.</p>
      </header>
      <Tabs defaultValue="calendar" className="flex flex-col gap-5">
        <TabsList className="w-full justify-start border-b border-border/70 bg-transparent p-0">
          <TabsTrigger value="calendar"><CalendarDays data-icon="inline-start" />Calendar</TabsTrigger>
          <TabsTrigger value="live"><Radio data-icon="inline-start" />Live controls</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar" className="mt-0"><ScheduleManager /></TabsContent>
        <TabsContent value="live" className="mt-0"><EventsManager /></TabsContent>
      </Tabs>
    </div>
  )
}
