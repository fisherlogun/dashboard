import { pgTable, text, timestamp } from "drizzle-orm/pg-core"

export const robloxUserCache = pgTable("roblox_user_cache", {
  robloxUserId: text("roblox_user_id").primaryKey(),
  username: text("username").notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
