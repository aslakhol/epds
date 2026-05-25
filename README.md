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
