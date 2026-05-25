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
      v.literal("weekly"),
      v.literal("monthly"),
    ),
    userId: v.id("users"),
  }).index("by_userId", ["userId"]),
});
