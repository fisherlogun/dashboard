import { MongoClient, type Db } from "mongodb"

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function getDatabase(): Promise<Db> {
  if (cachedDb) return cachedDb

  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set. Please add it in the Vars section of the sidebar.")
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(uri)
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
