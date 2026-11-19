# Dylan Grand Hotel

Spec-driven full-stack portfolio project — **boilerplate v0.1**. One hotel, two independently deployed frontend apps, one modular NestJS backend, PostgreSQL/Prisma.

> **Current state:** infrastructure scaffold only. Blank web/admin shells; API has one process-health endpoint. There are **no booking/auth/payment/business endpoints**, UI designs, room records, or Prisma business models.

## Tech stack

| Package | Stack | Local URL | Hosting target |
|---|---|---|---|
| `apps/web` | Next.js 16, React 19, TypeScript, Tailwind CSS v4 | http://localhost:3000 | Vercel Hobby |
| `apps/admin` | React 19 + Vite 8, TypeScript, Tailwind CSS v4 | http://localhost:5173 | Vercel Hobby (separate project) |
| `apps/api` | NestJS 12, REST, Prisma 7 PostgreSQL | http://localhost:4000/api/v1/health | Render Free |
| `infra/docker` | PostgreSQL 17 | localhost:5432 | Neon Free later |
| Image storage | Cloudinary (not connected) | — | Cloudinary Free |

## Prerequisites
- Node.js **24 LTS** (recommended, minimum `22.22.3` to accommodate Nest CLI generators).
- Corepack and pnpm (`packageManager` pins pnpm 12.3.4).
- Docker Desktop (for local PostgreSQL; frontend/API shells can start without it).
- Git and VS Code.

## Start on Windows (PowerShell in repository root)

```powershell
corepack enable
pnpm install
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/admin/.env.example apps/admin/.env.local
pnpm db:up
pnpm dev
```

Open [Web](http://localhost:3000) and [Admin](http://localhost:5173); both pages are intentionally blank. Check API: `http://localhost:4000/api/v1/health`.

**Do before first push:** `pnpm install` creates the **actual** `pnpm-lock.yaml`; commit it with the scaffold. No fake lockfile is bundled. npm registry was inaccessible in the generation environment, so dependency installs and actual build have **not been verified** there.

## Commands

```bash
pnpm dev                  # web + admin + api concurrently
pnpm dev:web              # Next.js :3000
pnpm dev:admin            # Vite :5173
pnpm dev:api              # NestJS :4000
pnpm db:up                # Docker PostgreSQL
pnpm db:down
pnpm db:validate          # Prisma configuration/schema (needs DATABASE_URL)
pnpm db:generate          # Explicitly generate Prisma client
pnpm db:migrate:dev       # Only AFTER first business schema is approved
pnpm lint
pnpm typecheck
pnpm build
pnpm check:structure      # Zero-dependency integrity tests
```

## Repository structure

```text
apps/
  web/          Next.js App Router, Customer Site (US-01…US-08)
  admin/        React/Vite, Admin Site (AD-01…AD-14)
  api/          NestJS REST, Prisma schema, one health endpoint
packages/
  ui/           Shared UI components — empty
  types/        Cross-app types — empty
  validation/   Zod contracts — empty
  api-client/   REST client — empty
  config/       Shared TypeScript base
infra/
  docker/       PostgreSQL Compose
  deploy/       Vercel/Render/Neon deployment plan
docs/
  requirements/ Kickoff DOCX and extracted Markdown
  architecture/ Baseline boundaries
  decisions/    Accepted stack/hosting ADR
  development/  Setup, CI and Git conventions
.github/workflows/ CI workflow
AGENTS.md      Guardrails for Codex
```

## Source of truth
- Requirements: `docs/requirements/KICKOFF.md` and original `.docx`.
- Stack / deploy: `docs/decisions/0001-stack-and-repo.md`.
- Codex instructions: `AGENTS.md`.
- See `docs/development/README.md` and `infra/deploy/README.md` before pushing/hosting.

## Important boundaries
- User/Admin **do not** query PostgreSQL directly. API owns data access.
- `GET /api/v1/health` is liveness only, not a database check.
- No speculative Booking/Room/User tables; pending requirements are deliberately not implemented.
- Do not commit credentials or real guest records.
- Project uses one GitHub monorepo; web and admin are separate Vercel projects, API is Render, database is Neon.
