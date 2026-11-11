import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { addActionLog, getLiveServers, getMemberRole, getProjectById, isGlobalAdmin } from "@/lib/db"
import { FIND_IDS, ISLAND_IDS } from "@/lib/game-catalog"
import { DatastoreConflictError, getVersionedDatastoreEntry, publishMessage, setVersionedDatastoreEntry } from "@/lib/roblox"
import { getSession } from "@/lib/auth"

type RobloxProject = { universe_id: string; api_key: string }

const DATASTORE = "ScubaOps"
const EVENT_TYPES = ["cash2x", "items2x", "luck2x", "frenzy"] as const
const weeklyDays = z.array(z.number().int().min(0).max(6)).max(7)

const scheduledEventSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().trim().min(1).max(80),
  event: z.enum(EVENT_TYPES),
  mult: z.number().min(1.5).max(10).optional(),
  minutes: z.number().int().min(1).max(1440),
  repeat: z.enum(["once", "daily", "weekly"]),
  start: z.number().int().positive().optional(),
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).optional(),
  days: weeklyDays.optional(),
  message: z.string().max(200).optional(),
  enabled: z.boolean().default(true),
}).superRefine((event, ctx) => {
  if (event.repeat === "once" && !event.start) ctx.addIssue({ code: "custom", path: ["start"], message: "One-time events require a start time" })
  if (event.repeat !== "once" && !event.time) ctx.addIssue({ code: "custom", path: ["time"], message: "Repeating events require a time" })
  if (event.repeat === "weekly" && (!event.days || event.days.length === 0)) ctx.addIssue({ code: "custom", path: ["days"], message: "Choose at least one day" })
})

const scheduleSchema = z.object({
  events: z.array(scheduledEventSchema).max(300),
})

function jsonError(error: unknown) {
  if (error instanceof DatastoreConflictError) return NextResponse.json({ error: "This record changed during the update. Refresh and try again." }, { status: 409 })
  return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 500 })
}

async function getAuthorizedProject(projectId: string) {
  const session = await getSession()
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const
  const project = await getProjectById(projectId)
  if (!project) return { error: NextResponse.json({ error: "Project not found" }, { status: 404 }) } as const
  const role = await getMemberRole(projectId, session.userId)
  if (!role && !isGlobalAdmin(session.userId)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const
  return { session, project: project as RobloxProject } as const
}

async function readDocument(project: RobloxProject, key: "settings" | "schedule"): Promise<{ data: Record<string, unknown>; version: string | null }> {
  const result = await getVersionedDatastoreEntry<Record<string, unknown>>(project.universe_id, DATASTORE, "global", key, project.api_key)
  const defaults = key === "settings" ? { autoEvents: true, liveEvent: null } : { version: 0, updatedAt: 0, events: [] }
  return { data: { ...defaults, ...(result.data ?? {}) }, version: result.version }
}

async function writeDocument(
  project: { universe_id: string; api_key: string },
  key: "settings" | "schedule",
  update: (current: Record<string, unknown>) => Record<string, unknown>,
) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await readDocument(project, key)
    try {
      const next = update(current.data)
      await setVersionedDatastoreEntry(project.universe_id, DATASTORE, "global", key, next, project.api_key, current.version)
      return next
    } catch (error) {
      if (!(error instanceof DatastoreConflictError) || attempt === 1) throw error
    }
  }
  throw new DatastoreConflictError()
}

async function publish(project: { universe_id: string; api_key: string }, payload: Record<string, unknown>) {
  await publishMessage(project.universe_id, "DashboardCommands", JSON.stringify(payload), project.api_key)
}

async function logWrite(
  projectId: string,
  userId: string,
  userName: string,
  action: string,
  target: string,
  payload: unknown,
) {
  await addActionLog(projectId, userId, userName, action, JSON.stringify({ who: userName, what: action, target, payload }))
}

function nextScheduledStart(event: Record<string, unknown>, nowSeconds: number) {
  if (event.enabled === false) return null
  if (event.repeat === "once") {
    const start = Number(event.start)
    return Number.isFinite(start) && start > nowSeconds ? start : null
  }
  if (typeof event.time !== "string") return null
  const [hours, minutes] = event.time.split(":").map(Number)
  const now = new Date(nowSeconds * 1000)
  for (let offset = 0; offset <= 8; offset += 1) {
    const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset, hours, minutes, 0))
    const day = candidate.getUTCDay()
    if (event.repeat === "weekly" && !((event.days as number[] | undefined) ?? []).includes(day)) continue
    const start = Math.floor(candidate.getTime() / 1000)
    if (start > nowSeconds) return start
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get("projectId")
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })
    const context = await getAuthorizedProject(projectId)
    if ("error" in context) return context.error
    const action = request.nextUrl.searchParams.get("action") ?? "overview"

    if (action === "settings") {
      const settings = await readDocument(context.project, "settings")
      return NextResponse.json({ settings: settings.data, version: settings.version })
    }
    if (action === "schedule") {
      const schedule = await readDocument(context.project, "schedule")
      return NextResponse.json({ schedule: schedule.data, version: schedule.version })
    }
    if (action !== "overview") return NextResponse.json({ error: "Invalid action" }, { status: 400 })

    const [settings, schedule, servers] = await Promise.all([
      readDocument(context.project, "settings"),
      readDocument(context.project, "schedule"),
      getLiveServers(projectId),
    ])
    const now = Math.floor(Date.now() / 1000)
    const scheduled = ((schedule.data.events as Record<string, unknown>[]) ?? [])
      .map((event) => ({ ...event, nextStart: nextScheduledStart(event, now) }))
      .filter((event) => event.nextStart !== null)
      .sort((left, right) => Number(left.nextStart) - Number(right.nextStart))[0] ?? null

    return NextResponse.json({
      settings: settings.data,
      servers: servers.map((server: Record<string, unknown>) => ({
        id: server.id,
        event: server.event,
        event_name: server.event_name,
        event_ends: server.event_ends,
        event_source: server.event_source,
      })),
      nextScheduledEvent: scheduled,
    })
  } catch (error) {
    return jsonError(error)
  }
}

const eventActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start-event"), projectId: z.string().min(1), event: z.enum(EVENT_TYPES), mult: z.number().min(1.5).max(10).optional(), minutes: z.number().int().min(1).max(1440), message: z.string().max(200).optional(), serverId: z.string().max(128).optional() }),
  z.object({ action: z.literal("stop-event"), projectId: z.string().min(1), serverId: z.string().max(128).optional() }),
  z.object({ action: z.literal("auto-events"), projectId: z.string().min(1), enabled: z.boolean() }),
  z.object({ action: z.literal("sighting"), projectId: z.string().min(1), island: z.string(), minutes: z.number().min(0.5).max(60) }),
  z.object({ action: z.literal("featured"), projectId: z.string().min(1), item: z.string(), minutes: z.number().int().min(1).max(1440) }),
  z.object({ action: z.literal("schedule-save"), projectId: z.string().min(1), schedule: scheduleSchema }),
  z.object({ action: z.literal("schedule-reload"), projectId: z.string().min(1) }),
])

export async function POST(request: NextRequest) {
  try {
    const parsed = eventActionSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 })
    const input = parsed.data
    const context = await getAuthorizedProject(input.projectId)
    if ("error" in context) return context.error

    let payload: Record<string, unknown> | null = null
    let datastoreValue: Record<string, unknown> | null = null
    let wroteDataStore = false
    let target: string = input.action

    if (input.action === "start-event") {
      const now = Math.floor(Date.now() / 1000)
      const mult = input.mult ?? (input.event === "frenzy" ? 3 : 2)
      const endsAt = now + input.minutes * 60
      const liveEvent = { event: input.event, mult, endsAt, message: input.message?.trim() ?? "" }
      if (!input.serverId) {
        datastoreValue = await writeDocument(context.project, "settings", (settings) => ({ ...settings, liveEvent }))
        wroteDataStore = true
        target = "ScubaOps/settings"
      }
      payload = { type: "event_start", ...liveEvent, minutes: input.minutes, endsAt, issuedBy: context.session.displayName }
      if (input.serverId) payload.serverId = input.serverId
    } else if (input.action === "stop-event") {
      datastoreValue = await writeDocument(context.project, "settings", (settings) => ({ ...settings, liveEvent: null }))
      wroteDataStore = true
      target = "ScubaOps/settings"
      payload = { type: "event_stop", issuedBy: context.session.displayName, ...(input.serverId ? { serverId: input.serverId } : {}) }
    } else if (input.action === "auto-events") {
      datastoreValue = await writeDocument(context.project, "settings", (settings) => ({ ...settings, autoEvents: input.enabled }))
      wroteDataStore = true
      payload = { type: "reload", issuedBy: context.session.displayName }
      target = "ScubaOps/settings.autoEvents"
    } else if (input.action === "sighting") {
      if (!ISLAND_IDS.has(input.island)) return NextResponse.json({ error: "Unknown island" }, { status: 400 })
      payload = { type: "sighting", island: input.island, minutes: input.minutes, issuedBy: context.session.displayName }
    } else if (input.action === "featured") {
      if (!FIND_IDS.has(input.item)) return NextResponse.json({ error: "Unknown featured find" }, { status: 400 })
      payload = { type: "featured", item: input.item, minutes: input.minutes, issuedBy: context.session.displayName }
    } else if (input.action === "schedule-save") {
      const events = input.schedule.events.map((event) => ({ ...event, label: event.label.trim(), message: event.message?.trim() ?? "" }))
      const schedule = await writeDocument(context.project, "schedule", (current) => ({
        ...current,
        version: Number(current.version ?? 0) + 1,
        updatedAt: Math.floor(Date.now() / 1000),
        events,
      }))
      datastoreValue = schedule
      wroteDataStore = true
      payload = { type: "reload", issuedBy: context.session.displayName }
      target = "ScubaOps/schedule"
    } else if (input.action === "schedule-reload") {
      payload = { type: "reload", issuedBy: context.session.displayName }
      target = "ScubaOps/schedule reload"
    }

    if (wroteDataStore) {
      await logWrite(input.projectId, context.session.userId, context.session.displayName, input.action, target, { datastore: datastoreValue, command: payload })
    }
    if (payload) await publish(context.project, payload)
    if (!wroteDataStore) {
      await logWrite(input.projectId, context.session.userId, context.session.displayName, input.action, target, payload)
    }
    return NextResponse.json({ success: true, payload })
  } catch (error) {
    return jsonError(error)
  }
}
