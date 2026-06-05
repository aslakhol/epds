import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  epdsResults: defineTable({
    answers: v.array(v.number()),
    score: v.number(),
    userId: v.id("users"),
  }).index("by_userId", ["userId"]),
  numbers: defineTable({
    value: v.number(),
  }),
  reminderPreferences: defineTable({
    cadence: v.union(
      v.literal("none"),
      v.literal("daily"),
      v.literal("biweekly"),
      v.literal("weekly"),
      v.literal("monthly"),
    ),
    lastReminderSentAt: v.optional(v.number()),
    lastSendAttemptAt: v.optional(v.number()),
    lastSendError: v.optional(v.string()),
    nextReminderAt: v.optional(v.number()),
    userId: v.id("users"),
  })
    .index("by_userId", ["userId"])
    .index("by_nextReminderAt", ["nextReminderAt"]),
});
