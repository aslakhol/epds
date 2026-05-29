import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron(
  "send due email reminders",
  "0 12 * * *",
  internal.reminders.sendDueEmailReminders,
  {},
);

export default crons;
