# Deployment plan (configuration only)

All three applications live in **one GitHub repository**, and deploy independently:

| Deployment | Host | Root directory | Framework/command |
|---|---|---|---|
| Customer Site | Vercel Hobby | `apps/web` | Next.js; build `next build` |
| Admin Site | Vercel Hobby | `apps/admin` | Vite; build `tsc --noEmit && vite build`, output `dist` |
| API | Render Free | repository root | Build: `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @dylan/api build`; start: `pnpm --filter @dylan/api start:prod` |
| Postgres | Neon Free | external DB | Use Neon connection string as `DATABASE_URL` |
| Images | Cloudinary Free | external service | Configure when upload spec is approved |

For each Vercel project, enable **Include source files outside of Root Directory** when needed for workspace packages. The Git repo is shared; each Vercel project has its own Root Directory and environment variables.

## Required variables
- Web: `NEXT_PUBLIC_API_URL=https://<api-host>/api/v1`
- Admin: `VITE_API_URL=https://<api-host>/api/v1`
- API: `DATABASE_URL` (Neon production URL), `CORS_ALLOWED_ORIGINS` (comma-separated exact frontend origins), `PORT` (provided by Render)

## Safety / readiness
1. Generate and commit **real** `pnpm-lock.yaml` by running `pnpm install` locally before creating deployment services.
2. Store actual secrets only in host environment settings; never commit them.
3. Add production Vercel URLs to `CORS_ALLOWED_ORIGINS`. Preview deploy domains require their own considered policy.
4. Build and smoke-test each app before deploying.
5. Do **not** auto-create DB tables / run `prisma migrate dev` at app startup. Later production migrations use `prisma migrate deploy` under a controlled release step.
6. Render Free can sleep when idle. This is acceptable for a portfolio demo.
7. Cloudinary, authentication, payment and email are intentionally **not connected** yet.

These are deployment instructions, not proof of deployed services. The deployment must be configured manually after pushing to GitHub.
