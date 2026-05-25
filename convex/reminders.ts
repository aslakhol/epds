import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { getNextReminderAt, ReminderCadence } from "./reminderDates";

const DUE_REMINDER_BATCH_SIZE = 50;

const reminderCadenceValidator = v.union(
  v.literal("weekly"),
  v.literal("monthly"),
);

export const sendDueEmailReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const dueReminders: Array<{
      cadence: ReminderCadence;
      email: string | null;
      preferenceId: Id<"reminderPreferences">;
    }> = await ctx.runQuery(internal.reminders.listDueEmailReminders, {
      limit: DUE_REMINDER_BATCH_SIZE,
      now,
    });

    for (const reminder of dueReminders) {
      if (reminder.email === null) {
        await ctx.runMutation(internal.reminders.markReminderSendFailed, {
          error: "Reminder user does not have an email address",
          preferenceId: reminder.preferenceId,
          attemptedAt: now,
        });
        continue;
      }

      try {
        await ctx.runAction(internal.emails.sendReminderEmail, {
          to: reminder.email,
        });
        await ctx.runMutation(internal.reminders.markReminderSent, {
          cadence: reminder.cadence,
          preferenceId: reminder.preferenceId,
          sentAt: now,
        });
      } catch (error) {
        await ctx.runMutation(internal.reminders.markReminderSendFailed, {
          error:
            error instanceof Error
              ? error.message
              : "Could not send reminder email",
          preferenceId: reminder.preferenceId,
          attemptedAt: now,
        });
      }
    }

    return { attempted: dueReminders.length };
  },
});

export const listDueEmailReminders = internalQuery({
  args: {
    limit: v.number(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const preferences = await ctx.db
      .query("reminderPreferences")
      .withIndex("by_nextReminderAt", (q) =>
        q.lte("nextReminderAt", args.now),
      )
      .take(args.limit);

    const dueReminders = [];

    for (const preference of preferences) {
      if (
        preference.cadence !== "weekly" &&
        preference.cadence !== "monthly"
      ) {
        continue;
      }

      const user = await ctx.db.get("users", preference.userId);
      dueReminders.push({
        cadence: preference.cadence,
        email: user?.email ?? null,
        preferenceId: preference._id,
      });
    }

    return dueReminders;
  },
});

export const markReminderSent = internalMutation({
  args: {
    cadence: reminderCadenceValidator,
    preferenceId: v.id("reminderPreferences"),
    sentAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch("reminderPreferences", args.preferenceId, {
      lastReminderSentAt: args.sentAt,
      lastSendAttemptAt: args.sentAt,
      lastSendError: "",
      nextReminderAt: getNextReminderAt(args.cadence, args.sentAt),
    });
    return null;
  },
});

export const markReminderSendFailed = internalMutation({
  args: {
    attemptedAt: v.number(),
    error: v.string(),
    preferenceId: v.id("reminderPreferences"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch("reminderPreferences", args.preferenceId, {
      lastSendAttemptAt: args.attemptedAt,
      lastSendError: args.error.slice(0, 1000),
    });
    return null;
  },
});
