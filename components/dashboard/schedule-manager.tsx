"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw, Save, Trash2 } from "lucide-react"
import { useSession } from "@/components/session-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { EVENT_LABELS, GAME_EVENTS } from "@/lib/game-catalog"

interface ScheduleEntry {
  id: string
  label: string
  event: string
  mult?: number
  minutes: number
  repeat: "once" | "daily" | "weekly"
  start?: number
  time?: string
  days?: number[]
  message?: string
  enabled?: boolean
}

interface ScheduleResponse { schedule: { events: ScheduleEntry[]; version?: number; updatedAt?: number }; version: string | null }
interface CalendarOccurrence { entry: ScheduleEntry; date: Date; time: string }

const fetcher = async (url: string): Promise<ScheduleResponse> => {
  const response = await fetch(url, { cache: "no-store" })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || "Unable to load event schedule")
  return result
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const pad = (value: number) => String(value).padStart(2, "0")
const utcDateKey = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
const utcDateTimeValue = (timestamp: number) => {
  const date = new Date(timestamp * 1000)
  return { date: utcDateKey(date), time: `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}` }
}

function makeCalendarDays(month: Date) {
  const first = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1))
  const start = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1 - first.getUTCDay()))
  return Array.from({ length: 42 }, (_, index) => new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + index)))
}

function getOccurrences(entries: ScheduleEntry[], days: Date[]) {
  const start = days[0]
  const end = days[days.length - 1]
  const occurrences: CalendarOccurrence[] = []
  for (const entry of entries) {
    if (entry.enabled === false) continue
    if (entry.repeat === "once") {
      if (entry.start) {
        const date = new Date(entry.start * 1000)
        if (date >= start && date < new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + 1))) {
          occurrences.push({ entry, date, time: `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}` })
        }
      }
      continue
    }
    const [hours, minutes] = (entry.time ?? "00:00").split(":").map(Number)
    for (const day of days) {
      if (entry.repeat === "weekly" && !entry.days?.includes(day.getUTCDay())) continue
      occurrences.push({ entry, date: new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hours, minutes)), time: entry.time ?? "00:00" })
    }
  }
  return occurrences
}

export function ScheduleManager() {
  const { activeProject } = useSession()
  const projectId = activeProject?.id
  const { data, error, isLoading, isValidating, mutate } = useSWR<ScheduleResponse>(
    projectId ? `/api/game-controls?action=schedule&projectId=${encodeURIComponent(projectId)}` : null,
    fetcher,
  )
  const [draftEntries, setDraftEntries] = useState<ScheduleEntry[] | null>(null)
  const [month, setMonth] = useState(() => new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)))
  const [selectedDate, setSelectedDate] = useState(() => utcDateKey(new Date()))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [label, setLabel] = useState("")
  const [event, setEvent] = useState("cash2x")
  const [strength, setStrength] = useState("2")
  const [minutes, setMinutes] = useState("60")
  const [repeat, setRepeat] = useState<ScheduleEntry["repeat"]>("once")
  const [time, setTime] = useState("18:00")
  const [days, setDays] = useState<number[]>([6, 0])
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)

  const entries = draftEntries ?? data?.schedule.events ?? []
  const calendarDays = useMemo(() => makeCalendarDays(month), [month])
  const occurrences = useMemo(() => getOccurrences(entries, calendarDays), [entries, calendarDays])
  const unsaved = draftEntries !== null

  function resetForm(date = selectedDate) {
    setEditingId(null)
    setLabel("")
    setEvent("cash2x")
    setStrength("2")
    setMinutes("60")
    setRepeat("once")
    setTime("18:00")
    setDays([6, 0])
    setMessage("")
    setSelectedDate(date)
  }

  function editEntry(entry: ScheduleEntry) {
    setEditingId(entry.id)
    setLabel(entry.label)
    setEvent(entry.event)
    setStrength(String(entry.mult ?? (entry.event === "frenzy" ? 3 : 2)))
    setMinutes(String(entry.minutes))
    setRepeat(entry.repeat)
    setTime(entry.repeat === "once" && entry.start ? utcDateTimeValue(entry.start).time : entry.time ?? "18:00")
    if (entry.repeat === "once" && entry.start) setSelectedDate(utcDateTimeValue(entry.start).date)
    setDays(entry.days ?? [])
    setMessage(entry.message ?? "")
  }

  function upsertEntry() {
    if (!label.trim()) { toast.error("Add an event name"); return }
    const numericMinutes = Number(minutes)
    const numericStrength = Number(strength)
    if (!Number.isInteger(numericMinutes) || numericMinutes < 1 || numericMinutes > 1440) { toast.error("Duration must be 1–1,440 minutes"); return }
    if (!Number.isFinite(numericStrength) || numericStrength < 1.5 || numericStrength > 10) { toast.error("Multiplier must be from 1.5x to 10x"); return }
    if (repeat === "weekly" && days.length === 0) { toast.error("Choose at least one day"); return }
    if (repeat === "once" && (!/^\\d{4}-\\d{2}-\\d{2}$/.test(selectedDate) || !/^\\d{2}:\\d{2}$/.test(time))) { toast.error("Choose a valid date and time"); return }
    const [year, monthNumber, day] = selectedDate.split("-").map(Number)
    const [hours, minute] = time.split(":").map(Number)
    if (repeat === "once" && Date.UTC(year, monthNumber - 1, day, hours, minute) <= Date.now()) { toast.error("Choose a future date and time"); return }
    const entry: ScheduleEntry = {
      id: editingId ?? crypto.randomUUID(),
      label: label.trim(),
      event,
      mult: numericStrength,
      minutes: numericMinutes,
      repeat,
      ...(repeat === "once" ? { start: Math.floor(Date.UTC(year, monthNumber - 1, day, hours, minute) / 1000) } : { time }),
      ...(repeat === "weekly" ? { days: [...days].sort() } : {}),
      message: message.trim(),
      enabled: editingId ? entries.find((item) => item.id === editingId)?.enabled !== false : true,
    }
    setDraftEntries(editingId ? entries.map((item) => item.id === editingId ? entry : item) : [...entries, entry])
    resetForm(selectedDate)
  }

  async function saveSchedule() {
    if (!projectId) return
    setSaving(true)
    try {
      const response = await fetch("/api/game-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, action: "schedule-save", schedule: { events: entries } }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Schedule could not be saved")
      setDraftEntries(null)
      await mutate()
      toast.success("Schedule saved; servers will reload it automatically")
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Network error")
    } finally { setSaving(false) }
  }

  async function publishReload() {
    if (!projectId) return
    try {
      const response = await fetch("/api/game-controls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, action: "schedule-reload" }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Reload could not be sent")
      toast.success("Schedule reload sent")
    } catch (caught) { toast.error(caught instanceof Error ? caught.message : "Network error") }
  }

  if (!projectId) return <div className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Select a project to manage event schedules.</div>

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><div className="mb-2 flex items-center gap-2 text-primary"><CalendarDays aria-hidden="true" className="size-4" /><span className="font-mono text-[11px] uppercase tracking-[0.16em]">UTC schedule</span></div><h2 className="font-serif text-2xl font-bold">Event Calendar</h2><p className="mt-1 text-[13px] text-muted-foreground">One-time and repeating events, shown in the game&apos;s schedule timezone (UTC).</p></div>
        <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => void publishReload()}><RefreshCw data-icon="inline-start" />Reload servers</Button><Button type="button" onClick={() => void saveSchedule()} disabled={!unsaved || saving}><Save data-icon="inline-start" />{saving ? "Saving…" : "Save schedule"}</Button></div>
      </div>
      {error && <p role="alert" className="border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error.message}</p>}
      {unsaved && <p role="status" className="text-sm text-warning">You have unsaved schedule changes.</p>}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.8fr)]">
        <section className="min-w-0 border border-[rgba(158,134,96,.5)] bg-card p-4 sm:p-6" aria-label="Event calendar">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div><p className="font-serif text-xl font-bold">{month.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</p><p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{entries.filter((entry) => entry.enabled !== false).length} active schedule entries</p></div>
            <div className="flex gap-1"><Button type="button" variant="outline" size="icon" aria-label="Previous month" onClick={() => setMonth((current) => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 1, 1)))}><ChevronLeft aria-hidden="true" /></Button><Button type="button" variant="outline" size="icon" aria-label="Next month" onClick={() => setMonth((current) => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1)))}><ChevronRight aria-hidden="true" /></Button></div>
          </div>
          <div className="grid grid-cols-7 border-b border-[rgba(158,134,96,.55)] pb-2 text-center">{WEEKDAYS.map((weekday) => <span key={weekday} className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{weekday}</span>)}</div>
          {isLoading ? <div className="grid grid-cols-7">{calendarDays.map((day) => <div key={day.toISOString()} className="min-h-24 border-b border-r border-border/40 p-2"><span className="text-xs text-muted-foreground">{day.getUTCDate()}</span></div>)}</div> : <div className="grid grid-cols-7 border-l border-border/40">
            {calendarDays.map((day) => {
              const dateKey = utcDateKey(day)
              const dayOccurrences = occurrences.filter((occurrence) => utcDateKey(occurrence.date) === dateKey)
              const inMonth = day.getUTCMonth() === month.getUTCMonth()
              const isToday = dateKey === utcDateKey(new Date())
              return <div key={dateKey} className={`min-h-24 border-b border-r border-border/40 p-1.5 sm:min-h-28 sm:p-2 ${inMonth ? "bg-card" : "bg-background/60"} ${dateKey === selectedDate ? "outline outline-1 outline-primary/70 -outline-offset-1" : ""}`}>
                <button type="button" className={`mb-1 flex size-7 items-center justify-center text-xs ${isToday ? "border border-primary text-primary" : inMonth ? "text-foreground" : "text-dim"}`} aria-label={`Add event on ${day.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}`} onClick={() => { resetForm(dateKey); if (!inMonth) setMonth(new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1))) }}>
                  {day.getUTCDate()}
                </button>
                <div className="flex flex-col gap-1">
                  {dayOccurrences.slice(0, 3).map(({ entry, time: runTime }, index) => <button key={`${entry.id}-${dateKey}-${index}`} type="button" title={`${entry.label} · ${runTime} UTC`} onClick={() => editEntry(entry)} className="truncate border border-[rgba(127,224,138,.35)] bg-[rgba(127,224,138,.08)] px-1 py-1 text-left text-[11px] font-bold text-[#a8e8ae] hover:border-[#7fe08a]">
                    <span className="font-mono">{runTime}</span><span className="ml-1 hidden sm:inline">{entry.label}</span><span className="ml-1 sm:hidden">{entry.mult ?? 2}x</span>
                  </button>)}
                  {dayOccurrences.length > 3 && <span className="px-1 text-[11px] text-muted-foreground">+{dayOccurrences.length - 3} more</span>}
                </div>
              </div>
            })}
          </div>}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] uppercase tracking-wider text-muted-foreground"><span className="flex items-center gap-2"><span className="size-2 border border-[#7fe08a] bg-[#7fe08a]/20" />Scheduled event</span><span>Select a date to add an event</span></div>
        </section>

        <aside className="flex flex-col gap-5">
          <section className="border border-[rgba(158,134,96,.5)] bg-card p-4 sm:p-5">
            <div className="mb-4"><p className="font-serif text-lg font-bold">{editingId ? "Edit Event" : "Add Event"}</p><p className="mt-1 text-xs text-muted-foreground">Create a one-time event or set recurring days.</p></div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5"><Label htmlFor="schedule-label">Event name</Label><Input id="schedule-label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder="Weekend cash boost" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5"><Label htmlFor="schedule-event">Event type</Label><Select value={event} onValueChange={setEvent}><SelectTrigger id="schedule-event"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{GAME_EVENTS.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectGroup></SelectContent></Select></div>
                <div className="flex flex-col gap-1.5"><Label htmlFor="schedule-repeat">Repeat</Label><Select value={repeat} onValueChange={(value) => setRepeat(value as ScheduleEntry["repeat"])}><SelectTrigger id="schedule-repeat"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="once">One time</SelectItem><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem></SelectGroup></SelectContent></Select></div>
                <div className="flex flex-col gap-1.5"><Label htmlFor="schedule-multiplier">Multiplier</Label><Input id="schedule-multiplier" type="number" min="1.5" max="10" step="0.5" value={strength} onChange={(e) => setStrength(e.target.value)} /></div>
                <div className="flex flex-col gap-1.5"><Label htmlFor="schedule-duration">Minutes</Label><Input id="schedule-duration" type="number" min="1" max="1440" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></div>
                {repeat === "once" && <div className="col-span-2 flex flex-col gap-1.5"><Label htmlFor="schedule-date">Date (UTC)</Label><Input id="schedule-date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} /></div>}
                <div className="col-span-2 flex flex-col gap-1.5"><Label htmlFor="schedule-time">{repeat === "once" ? "Start time (UTC)" : "Repeats at (UTC)"}</Label><Input id="schedule-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
              </div>
              {repeat === "weekly" && <fieldset className="flex flex-col gap-2"><legend className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Repeat on</legend><div className="flex flex-wrap gap-2">{WEEKDAYS.map((weekday, index) => <label key={weekday} className={`flex cursor-pointer items-center gap-1.5 border px-2 py-1.5 text-xs ${days.includes(index) ? "border-primary/70 bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"}`}><Checkbox checked={days.includes(index)} onCheckedChange={(checked) => setDays((current) => checked ? [...new Set([...current, index])] : current.filter((value) => value !== index))} />{weekday}</label>)}</div></fieldset>}
              <div className="flex flex-col gap-1.5"><Label htmlFor="schedule-message">Player message</Label><Textarea id="schedule-message" value={message} maxLength={200} onChange={(e) => setMessage(e.target.value)} placeholder="Optional message shown with the event" className="min-h-16 resize-y" /><span className="text-right text-[11px] text-muted-foreground">{message.length}/200</span></div>
              <div className="flex gap-2"><Button type="button" onClick={upsertEntry}><Plus data-icon="inline-start" />{editingId ? "Update event" : "Add event"}</Button>{editingId && <Button type="button" variant="outline" onClick={() => resetForm()}>Cancel</Button>}</div>
            </div>
          </section>

          <section className="border border-[rgba(158,134,96,.5)] bg-card p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2"><div><p className="font-serif text-lg font-bold">Scheduled Events</p><p className="mt-1 text-xs text-muted-foreground">{entries.length} of 300 maximum</p></div><span className="text-[11px] uppercase text-muted-foreground">{isValidating ? "Syncing" : "UTC"}</span></div>
            <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
              {entries.length === 0 ? <p className="py-5 text-center text-xs text-muted-foreground">No events scheduled yet.</p> : entries.map((entry) => <div key={entry.id} className="flex items-center gap-2 border border-[rgba(158,134,96,.25)] bg-[#1f2228] p-2.5">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => editEntry(entry)}><span className="block truncate text-xs font-bold">{entry.label}</span><span className="mt-1 block truncate text-[11px] text-muted-foreground">{entry.mult ?? 2}x {EVENT_LABELS[entry.event] ?? entry.event} · {entry.repeat === "weekly" ? `Weekly · ${entry.days?.map((day) => WEEKDAYS[day]).join(", ")}` : entry.repeat === "daily" ? "Daily" : "One time"}</span></button>
                <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${entry.label}`} onClick={() => setDraftEntries(entries.filter((item) => item.id !== entry.id))}><Trash2 aria-hidden="true" /></Button>
              </div>)}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
