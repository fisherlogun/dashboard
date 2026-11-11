import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

const globalForDb = globalThis as typeof globalThis & { scubaOpsPool?: Pool }

const pool = globalForDb.scubaOpsPool ?? new Pool({ connectionString: process.env.DATABASE_URL })
if (process.env.NODE_ENV !== "production") globalForDb.scubaOpsPool = pool

export const db = drizzle(pool, { schema })
