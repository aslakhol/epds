import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { MutationCtx, mutation, query } from "./_generated/server";
import { getNextReminderAt } from "./reminderDates";

const answersValidator = v.array(v.number());
const reminderCadenceValidator = v.union(
  v.literal("biweekly"),
  v.literal("weekly"),
  v.literal("monthly"),
);

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
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    return await ctx.db.insert("epdsResults", {
      answers: args.answers,
      score: args.score,
      userId,
    });
  },
});

export const deleteResult = mutation({
  args: {
    resultId: v.id("epdsResults"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const result = await ctx.db.get("epdsResults", args.resultId);

    if (result === null) {
      return null;
    }

    if (result.userId !== userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete("epdsResults", args.resultId);
    return null;
  },
});

export const setReminderPreference = mutation({
  args: {
    cadence: reminderCadenceValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const now = Date.now();
    const existingPreference = await ctx.db
      .query("reminderPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existingPreference === null) {
      await ctx.db.insert("reminderPreferences", {
        cadence: args.cadence,
        nextReminderAt: getNextReminderAt(args.cadence, now),
        userId,
      });
    } else {
      await ctx.db.patch("reminderPreferences", existingPreference._id, {
        cadence: args.cadence,
        lastSendError: "",
        nextReminderAt:
          existingPreference.cadence === args.cadence &&
          existingPreference.nextReminderAt !== undefined
            ? existingPreference.nextReminderAt
            : getNextReminderAt(args.cadence, now),
      });
    }

    return null;
  },
});

export const deleteReminderPreference = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx);
    const existingPreference = await ctx.db
      .query("reminderPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existingPreference !== null) {
      await ctx.db.delete("reminderPreferences", existingPreference._id);
    }

    return null;
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
      .take(20);

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
