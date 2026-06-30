import { v } from "convex/values";
import { internalAction } from "./_generated/server";

declare const process: { env: Record<string, string | undefined> };

const SENDGRID_MAIL_SEND_URL = "https://api.sendgrid.com/v3/mail/send";
const DEFAULT_FROM_NAME = "New parent check-in";

export const sendReminderEmail = internalAction({
  args: {
    to: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey === undefined) {
      throw new Error("SENDGRID_API_KEY is not configured");
    }

    const appUrl = process.env.EPDS_APP_URL;
    if (appUrl === undefined) {
      throw new Error("EPDS_APP_URL is not configured");
    }

    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    if (fromEmail === undefined) {
      throw new Error("SENDGRID_FROM_EMAIL is not configured");
    }

    const fromName = process.env.SENDGRID_FROM_NAME ?? DEFAULT_FROM_NAME;

    const response = await fetch(SENDGRID_MAIL_SEND_URL, {
      body: JSON.stringify({
        content: [
          {
            type: "text/plain",
            value: [
              "How have you been feeling this week?",
              "",
              "Take a few minutes for a quick check-in.",
              "",
              `Start your check-in: ${appUrl}`,
              "",
              "You're receiving this because you turned on email reminders. You can change or turn them off in your account.",
            ].join("\n"),
          },
          {
            type: "text/html",
            value: [
              "<p>How have you been feeling this week?</p>",
              "<p>Take a few minutes for a quick check-in.</p>",
              `<p><a href="${escapeHtml(appUrl)}">Start your check-in</a></p>`,
              "<p>You're receiving this because you turned on email reminders. You can change or turn them off in your account.</p>",
            ].join(""),
          },
        ],
        from: {
          email: fromEmail,
          name: fromName,
        },
        personalizations: [
          {
            to: [{ email: args.to }],
          },
        ],
        subject: "Time for a quick check-in",
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `SendGrid send failed with ${response.status}: ${responseText}`,
      );
    }

    return null;
  },
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
