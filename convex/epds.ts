import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { MutationCtx, mutation, query } from "./_generated/server";

const answersValidator = v.array(v.number());

async function requireAuthUserId(ctx: MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Not authenticated");
  }
  return userId;
}

export const saveResult = mutation({
  args: {
    answers: answersValidator,
    score: v.number(),
    reminderCadence: v.union(
      v.literal("none"),
      v.literal("weekly"),
      v.literal("monthly"),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const resultId = await ctx.db.insert("epdsResults", {
      answers: args.answers,
      score: args.score,
      userId,
    });

    const existingPreference = await ctx.db
      .query("reminderPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existingPreference === null) {
      await ctx.db.insert("reminderPreferences", {
        cadence: args.reminderCadence,
        userId,
      });
    } else {
      await ctx.db.patch("reminderPreferences", existingPreference._id, {
        cadence: args.reminderCadence,
      });
    }

    return resultId;
  },
});

export const listMyResults = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    const results = await ctx.db
      .query("epdsResults")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(5);

    return results.map((result) => ({
      _id: result._id,
      _creationTime: result._creationTime,
      score: result.score,
    }));
  },
});

export const getReminderPreference = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    return await ctx.db
      .query("reminderPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  },
});
