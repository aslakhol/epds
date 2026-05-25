import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "send due email reminders",
  { hours: 24 },
  internal.reminders.sendDueEmailReminders,
  {},
);

export default crons;
