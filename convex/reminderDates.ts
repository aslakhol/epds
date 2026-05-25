export type ReminderCadence = "weekly" | "monthly";

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

export function getNextReminderAt(cadence: ReminderCadence, from: number) {
  if (cadence === "weekly") {
    return from + WEEK_IN_MS;
  }

  return addCalendarMonth(from);
}

function addCalendarMonth(from: number) {
  const date = new Date(from);
  const originalDay = date.getUTCDate();
  const targetMonth = date.getUTCMonth() + 1;

  date.setUTCDate(1);
  date.setUTCMonth(targetMonth);

  const lastDayOfTargetMonth = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();

  date.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
  return date.getTime();
}
