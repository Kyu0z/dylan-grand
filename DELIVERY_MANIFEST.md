# Delivery manifest — Initial boilerplate v0.1

**Action:** New repository scaffold (all included paths are Added).

## Contents
- `apps/web`: Next.js + TypeScript + Tailwind v4, blank App Router shell.
- `apps/admin`: React + Vite + TypeScript + Tailwind v4, blank app shell.
- `apps/api`: NestJS REST application; `/api/v1/health` liveness only.
- `apps/api/prisma`: PostgreSQL datasource and Prisma v7 setup, no tables/models.
- `packages/*`: workspace names and empty public exports, shared TS config.
- `infra/docker`: local PostgreSQL Compose.
- `infra/deploy`: three-app, same-Git-repo deployment notes.
- `docs/requirements`: original Word kickoff and full Markdown extraction.
- `docs/architecture`, `docs/decisions`, `docs/development`: boundaries and setup notes.
- `AGENTS.md`, `.github/workflows/ci.yml`, `.vscode/*`, root tooling.

## Verified in archive-generation environment
- JSON parse, YAML parse, file paths, relative references and zip integrity.
- Zero-dependency Node smoke tests (`node --test tools/smoke/structure.test.mjs`).
- JavaScript syntax check of `.mjs` files.

## Not verified here
- pnpm dependency installation, Next/Vite/Nest builds and TypeScript/ESLint checks.
- Docker/PostgreSQL boot, migration execution, API responses.

**Reason:** registry access was unavailable. A genuine `pnpm-lock.yaml` must be produced with `pnpm install` locally, then committed.
