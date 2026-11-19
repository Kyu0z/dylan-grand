# API
NestJS REST API shell, at http://localhost:4000. Only `GET /api/v1/health` is implemented.
No business endpoints, auth, reservations, pricing, payment, or seeded records.

## Prisma / PostgreSQL
- `prisma/schema.prisma` contains **no business models** until approved.
- Prisma v7 CLI config in `prisma.config.ts` reads `DATABASE_URL` from this folder's `.env`.
- `pnpm db:validate` validates schema/config (requires `DATABASE_URL`).
- `pnpm db:generate` generates typed client when models are added.
- `pnpm db:migrate:dev --name init` should run **only after schema approval**.
- PrismaClient runtime injection/adapter will be wired when the persistence contract is defined; installed Postgres adapter does not imply a working repository layer yet.
- `GET /health` is a process liveness endpoint, **not** a database health check.

Deployment: Render Web Service, Root Directory repository root. See `../../infra/deploy/README.md`.
