import { MongoClient, type Db } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is not set")
}

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function getDatabase(): Promise<Db> {
  if (cachedDb) return cachedDb

  if (!cachedClient) {
    cachedClient = new MongoClient(MONGODB_URI)
    await cachedClient.connect()
  }

  cachedDb = cachedClient.db("roblox_dashboard")
  return cachedDb
}

// Collection helpers
export async function getBansCollection() {
  const db = await getDatabase()
  return db.collection("bans")
}

export async function getLicensesCollection() {
  const db = await getDatabase()
  return db.collection("licenses")
}

export async function getActionLogsCollection() {
  const db = await getDatabase()
  return db.collection("action_logs")
}

export async function getServerSnapshotsCollection() {
  const db = await getDatabase()
  return db.collection("server_snapshots")
}
