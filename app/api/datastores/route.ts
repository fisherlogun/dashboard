import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getConfig } from "@/lib/db"
import { hasPermission } from "@/lib/roles"
import {
  listDatastores,
  getDatastoreEntry,
  setDatastoreEntry,
} from "@/lib/roblox"
import { z } from "zod"

// GET /api/datastores?action=list | ?action=get&name=...&scope=...&key=...
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!hasPermission(session.role, "manage_datastores")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const config = getConfig()
    if (!config) {
      return NextResponse.json({ error: "Setup not complete" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action") ?? "list"

    if (action === "list") {
      const cursor = searchParams.get("cursor") ?? undefined
      const result = await listDatastores(config.universeId, config.apiKey, cursor)
      return NextResponse.json(result)
    }

    if (action === "get") {
      const name = searchParams.get("name")
      const scope = searchParams.get("scope") ?? "global"
      const key = searchParams.get("key")

      if (!name || !key) {
        return NextResponse.json(
          { error: "name and key are required" },
          { status: 400 }
        )
      }

      const data = await getDatastoreEntry(
        config.universeId,
        name,
        scope,
        key,
        config.apiKey
      )
      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/datastores - set entry
const setSchema = z.object({
  name: z.string().min(1),
  scope: z.string().default("global"),
  key: z.string().min(1),
  data: z.unknown(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!hasPermission(session.role, "manage_datastores")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const config = getConfig()
    if (!config) {
      return NextResponse.json({ error: "Setup not complete" }, { status: 400 })
    }

    const body = await request.json()
    const parsed = setSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { name, scope, key, data } = parsed.data
    await setDatastoreEntry(config.universeId, name, scope, key, data, config.apiKey)

    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
