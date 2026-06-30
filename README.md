# EPDS

A small personal web app for filling out the Edinburgh Postnatal Depression Scale, seeing a score, and keeping track of scores over time.

Built with:

- React
- Vite
- Convex
- Convex Auth

## Development

```sh
pnpm install
pnpm dev
```

## Email reminders

Biweekly, weekly, and monthly reminders are sent with SendGrid from a Convex cron.
Configure these Convex environment variables before enabling reminders in
production:

```sh
SENDGRID_API_KEY=...
EPDS_APP_URL=https://epds.shera.no
SENDGRID_FROM_EMAIL=post@shera.no
SENDGRID_FROM_NAME=Shera
```

`EPDS_APP_URL`, `SENDGRID_FROM_EMAIL`, and `SENDGRID_FROM_NAME` are optional if
the defaults are correct.

## Vercel deployment

Set the Vercel build command to:

```sh
npx convex deploy --cmd-url-env-var-name VITE_CONVEX_URL --cmd 'pnpm run build'
```

This is also checked in as `vercel.json`. Add `CONVEX_DEPLOY_KEY` in Vercel
for Production using a production deploy key from the Convex dashboard. Convex
will inject `VITE_CONVEX_URL` during the Vite build so the deployed frontend
connects to the production Convex deployment.

## Notes

This is a small tool for private use. The project currently has no open source license.
