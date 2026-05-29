import { v } from "convex/values";
import { internalAction } from "./_generated/server";

declare const process: { env: Record<string, string | undefined> };

const SENDGRID_MAIL_SEND_URL = "https://api.sendgrid.com/v3/mail/send";
const DEFAULT_FROM_EMAIL = "post@shera.no";
const DEFAULT_FROM_NAME = "Shera";
const DEFAULT_APP_URL = "https://epds.shera.no";

export const sendReminderEmail = internalAction({
  args: {
    to: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey === undefined) {
      throw new Error("SENDGRID_API_KEY is not configured");
    }

    const appUrl = process.env.EPDS_APP_URL ?? DEFAULT_APP_URL;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL ?? DEFAULT_FROM_EMAIL;
    const fromName = process.env.SENDGRID_FROM_NAME ?? DEFAULT_FROM_NAME;

    const response = await fetch(SENDGRID_MAIL_SEND_URL, {
      body: JSON.stringify({
        content: [
          {
            type: "text/plain",
            value: [
              "It is time for your saved epds check-in.",
              "",
              `Open the app here: ${appUrl}`,
              "",
              "You can cancel these reminders from your account.",
            ].join("\n"),
          },
          {
            type: "text/html",
            value: [
              "<p>It is time for your saved epds check-in.</p>",
              `<p><a href="${escapeHtml(appUrl)}">Open the app</a></p>`,
              "<p>You can cancel these reminders from your account.</p>",
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
        subject: "Your epds check-in reminder",
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
