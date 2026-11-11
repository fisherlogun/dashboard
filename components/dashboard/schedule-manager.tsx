"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { CalendarClock, Clock3, Plus, Save, Trash2 } from "lucide-react"
import { useSession } from "@/components/session-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

const fetcher = async (url: string): Promise<ScheduleResponse> => {
  const response = await fetch(url, { cache: "no-store" })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || "Unable to load event schedule")
  return result
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const WEEKDAY_NUMBERS = [0, 1, 2, 3, 4, 5, 6]
const pad = (value: number) => String(value).padStart(2, "0")

function utcTimeToLocal(utcTime: string) {
  const [hours, minutes] = utcTime.split(":").map(Number)
  const date = new Date()
  date.setUTCHours(hours, minutes, 0, 0)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function localTimeToUtc(localTime: string) {
  const [hours, minutes] = localTime.split(":").map(Number)
  const now = new Date()
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes)
  return `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`
}

function localDateTimeValue(timestamp: number) {
  const date = new Date(timestamp * 1000)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function localDateTimeToUnix(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : Math.floor(date.getTime() / 1000)
}

function getNextRuns(entries: ScheduleEntry[], count = 10) {
  const now = Math.floor(Date.now() / 1000)
  const runs: Array<{ id: string; label: string; event: string; start: number; end: number }> = []
  for (const entry of entries) {
    if (entry.enabled === false) continue
    const duration = entry.minutes * 60
    if (entry.repeat === "once") {
      if (entry.start && entry.start > now) runs.push({ id: entry.id, label: entry.label, event: entry.event, start: entry.start, end: entry.start + duration })
      continue
    }
    const [hours, minutes] = (entry.time ?? "00:00").split(":").map(Number)
    for (let offset = 0; offset < 35; offset += 1) {
      const today = new Date()
      const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset, hours, minutes))
      if (entry.repeat === "weekly" && !entry.days?.includes(date.getUTCDay())) continue
      const start = Math.floor(date.getTime() / 1000)
      if (start > now) runs.push({ id: entry.id, label: entry.label, event: entry.event, start, end: start + duration })
      if (runs.filter((run) => run.id === entry.id).length >= count) break
    }
  }
  const sorted = runs.sort((a, b) => a.start - b.start).slice(0, count)
  return sorted.map((run, index) => ({
    ...run,
    overlaps: sorted.slice(0, index).some((previous) => previous.end > run.start),
  }))
}

export function ScheduleManager() {
  const { activeProject } = useSession()
  const projectId = activeProject?.id
  const { data, error, mutate } = useSWR<ScheduleResponse>(
    projectId ? `/api/game-controls?action=schedule&projectId=${encodeURIComponent(projectId)}` : null,
    fetcher,
  )
  const [draftEntries, setDraftEntries] = useState<ScheduleEntry[] | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [label, setLabel] = useState("")
  const [event, setEvent] = useState("cash2x")
  const [strength, setStrength] = useState("2")
  const [minutes, setMinutes] = useState("60")
  const [repeat, setRepeat] = useState<ScheduleEntry["repeat"]>("once")
  const [startLocal, setStartLocal] = useState("")
  const [localTime, setLocalTime] = useState("18:00")
  const [days, setDays] = useState<number[]>([6, 0])
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)

  const entries = draftEntries ?? data?.schedule.events ?? []
  const nextRuns = useMemo(() => getNextRuns(entries), [entries])
  const unsaved = draftEntries !== null

  function resetForm() {
    setEditingId(null)
    setLabel("")
    setEvent("cash2x")
    setStrength("2")
    setMinutes("60")
    setRepeat("once")
    setStartLocal("")
    setLocalTime("18:00")
    setDays([6, 0])
    setMessage("")
  }

  function editEntry(entry: ScheduleEntry) {
    setEditingId(entry.id)
    setLabel(entry.label)
    setEvent(entry.event)
    setStrength(String(entry.mult ?? (entry.event === "frenzy" ? 3 : 2)))
    setMinutes(String(entry.minutes))
    setRepeat(entry.repeat)
    setStartLocal(entry.start ? localDateTimeValue(entry.start) : "")
    setLocalTime(entry.time ? utcTimeToLocal(entry.time) : "18:00")
    setDays(entry.days ?? [])
    setMessage(entry.message ?? "")
  }

  function upsertEntry() {
    if (!label.trim()) { toast.error("Add a schedule label"); return }
    const numericMinutes = Number(minutes)
    const numericStrength = Number(strength)
    if (!Number.isInteger(numericMinutes) || numericMinutes < 1 || numericMinutes > 1440) { toast.error("Duration must be 1–1,440 minutes"); return }
    if (!Number.isFinite(numericStrength) || numericStrength < 1.5 || numericStrength > 10) { toast.error("Strength must be from 1.5x to 10x"); return }
    if (repeat === "once" && !localDateTimeToUnix(startLocal)) { toast.error("Choose a valid local start date and time"); return }
    if (repeat === "weekly" && days.length === 0) { toast.error("Choose at least one weekday"); return }

    const entry: ScheduleEntry = {
      id: editingId ?? crypto.randomUUID(),
      label: label.trim(),
      event,
      mult: numericStrength,
      minutes: numericMinutes,
      repeat,
      ...(repeat === "once" ? { start: localDateTimeToUnix(startLocal)! } : { time: localTimeToUtc(localTime) }),
      ...(repeat === "weekly" ? { days: [...days].sort() } : {}),
      message: message.trim(),
      enabled: editingId ? entries.find((item) => item.id === editingId)?.enabled !== false : true,
    }
    setDraftEntries(editingId ? entries.map((item) => item.id === editingId ? entry : item) : [...entries, entry])
    resetForm()
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
    } finally {
      setSaving(false)
    }
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

  if (!projectId) return <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Select a project to manage event schedules.</div>

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><div className="mb-2 flex items-center gap-2 text-primary"><CalendarClock aria-hidden="true" className="size-4" /><span className="font-mono text-[10px] uppercase tracking-[0.18em]">UTC schedule · local display</span></div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Event schedule</h1><p className="mt-1 text-sm text-muted-foreground">Plan one-time, daily or weekly events. All game servers evaluate the same UTC schedule.</p></div>
        <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => void publishReload()}>Reload servers</Button><Button type="button" onClick={() => void saveSchedule()} disabled={!unsaved || saving}><Save data-icon="inline-start" />{saving ? "Saving…" : "Save schedule"}</Button></div>
      </header>
      {error && <div role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error.message}</div>}
      {unsaved && <p role="status" className="text-sm text-warning">You have unsaved schedule changes.</p>}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)]">
        <Card className="border-border/70 bg-card/80">
          <CardHeader><CardTitle>{editingId ? "Edit schedule entry" : "Create schedule entry"}</CardTitle><CardDescription>Repeating times and weekdays are stored in UTC; inputs below use your local time.</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2 sm:col-span-2"><Label htmlFor="schedule-label">Label</Label><Input id="schedule-label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder="Weekend cash boost" /></div>
              <div className="flex flex-col gap-2"><Label htmlFor="schedule-event">Event</Label><Select value={event} onValueChange={setEvent}><SelectTrigger id="schedule-event"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{GAME_EVENTS.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectGroup></SelectContent></Select></div>
              <div className="flex flex-col gap-2"><Label htmlFor="schedule-strength">Multiplier</Label><Input id="schedule-strength" type="number" min="1.5" max="10" step="0.5" value={strength} onChange={(e) => setStrength(e.target.value)} /></div>
              <div className="flex flex-col gap-2"><Label htmlFor="schedule-minutes">Duration (minutes)</Label><Input id="schedule-minutes" type="number" min="1" max="1440" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></div>
              <div className="flex flex-col gap-2"><Label htmlFor="schedule-repeat">Repeat</Label><Select value={repeat} onValueChange={(value) => setRepeat(value as ScheduleEntry["repeat"])}><SelectTrigger id="schedule-repeat"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="once">One time</SelectItem><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem></SelectGroup></SelectContent></Select></div>
              {repeat === "once" ? <div className="flex flex-col gap-2 sm:col-span-2"><Label htmlFor="schedule-start">Start date and time (local)</Label><Input id="schedule-start" type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} /></div> : <div className="flex flex-col gap-2"><Label htmlFor="schedule-time">Start time (local)</Label><Input id="schedule-time" type="time" value={localTime} onChange={(e) => setLocalTime(e.target.value)} /></div>}
              {repeat === "weekly" && <fieldset className="flex flex-col gap-2 sm:col-span-2"><legend className="text-sm font-medium">Weekdays</legend><div className="flex flex-wrap gap-2">{WEEKDAY_NUMBERS.map((day) => <label key={day} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"><Checkbox checked={days.includes(day)} onCheckedChange={(checked) => setDays((current) => checked ? [...new Set([...current, day])] : current.filter((value) => value !== day))} />{WEEKDAYS[day]}</label>)}</div></fieldset>}
              <div className="flex flex-col gap-2 sm:col-span-2"><Label htmlFor="schedule-message">Player message</Label><Textarea id="schedule-message" value={message} maxLength={200} onChange={(e) => setMessage(e.target.value)} placeholder="Optional message shown with the event card" /><p className="text-right text-xs text-muted-foreground">{message.length}/200</p></div>
            </div>
            <div className="flex flex-wrap gap-2"><Button type="button" onClick={upsertEntry}><Plus data-icon="inline-start" />{editingId ? "Update entry" : "Add to schedule"}</Button>{editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancel edit</Button>}</div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="border-border/70 bg-card/80"><CardHeader><CardTitle>Scheduled entries</CardTitle><CardDescription>{entries.length} of 300 maximum · entries are evaluated by every server.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3">{entries.length === 0 ? <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No events scheduled yet.</p> : entries.map((entry) => <div key={entry.id} className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background/50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{entry.label}</p><Badge variant={entry.enabled === false ? "secondary" : "outline"}>{entry.enabled === false ? "Disabled" : entry.repeat}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{entry.mult ?? 2}x {EVENT_LABELS[entry.event] ?? entry.event} · {entry.minutes} min</p><p className="mt-1 text-xs text-muted-foreground">{entry.repeat === "once" ? new Date((entry.start ?? 0) * 1000).toLocaleString() : `${entry.repeat === "daily" ? "Every day" : `Every ${entry.days?.map((day) => WEEKDAYS[day]).join(", ")}`} at ${entry.time ? utcTimeToLocal(entry.time) : "—"} local (${entry.time ?? "—"} UTC)`}</p></div><div className="flex shrink-0 gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setDraftEntries(entries.map((item) => item.id === entry.id ? { ...item, enabled: item.enabled === false } : item))}>{entry.enabled === false ? "Enable" : "Disable"}</Button><Button type="button" variant="outline" size="sm" onClick={() => editEntry(entry)}>Edit</Button><Button type="button" variant="ghost" size="icon" aria-label={`Delete ${entry.label}`} onClick={() => { if (window.confirm(`Delete schedule entry “${entry.label}”?`)) setDraftEntries(entries.filter((item) => item.id !== entry.id)) }}><Trash2 aria-hidden="true" /></Button></div></div>)}</CardContent></Card>

          <Card className="border-border/70 bg-card/80"><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 aria-hidden="true" className="size-4 text-primary" />Upcoming runs</CardTitle><CardDescription>Next 10 enabled occurrences, calculated in UTC and displayed in your local timezone.</CardDescription></CardHeader><CardContent className="flex flex-col gap-2">{nextRuns.length ? nextRuns.map((run, index) => <div key={`${run.id}-${run.start}`} className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2"><div className="min-w-0"><p className="truncate text-sm font-medium">{run.label}</p><p className="text-xs text-muted-foreground">{EVENT_LABELS[run.event] ?? run.event} · {new Date(run.start * 1000).toLocaleString()}</p></div>{run.overlaps && <Badge variant="destructive">Overlap</Badge>}{index === 0 && !run.overlaps && <Badge variant="outline">Next</Badge>}</div>) : <p className="text-sm text-muted-foreground">No upcoming runs.</p>}</CardContent></Card>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Times are stored as UTC Unix seconds. Daily and weekly schedule times are stored as UTC HH:MM; local display reflects the browser timezone.</p>
    </div>
  )
}
