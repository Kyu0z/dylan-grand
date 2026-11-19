# AGENTS.md — Dylan Grand Hotel

## Source of truth
- Read `docs/requirements/KICKOFF.md` and `docs/decisions/0001-stack-and-repo.md` before changing architecture.
- The product covers **one hotel** with Customer Site (US-01…US-08) and Admin Site (AD-01…AD-14).
- The current repository is **boilerplate only**. No UI, business entities, booking, authentication or payments have been approved for implementation in this phase.
- When a spec is ambiguous or undecided, do **not** invent business rules; document the question and request a decision.

## Modules and boundaries
- `apps/web`: Next.js, TypeScript, Tailwind CSS (Customer Site).
- `apps/admin`: React, Vite, TypeScript, Tailwind CSS (Admin Site).
- `apps/api`: NestJS REST API; **single backend** for both frontends.
- `apps/api/prisma`: Prisma v7 + PostgreSQL schema/migrations only when approved.
- `packages/ui`: shared presentational components; no site-specific page layouts.
- `packages/types`, `validation`, `api-client`: shared contracts; avoid cross-app imports into other apps' `src` directories.
- `packages/config`: common tooling configuration.
- Keep a modular monolith; do not add services, microservices, queues or Redis without a spec/ADR.

## Working on a feature
1. Identify related `US-xx` / `AD-xx` requirement IDs from the kickoff.
2. Restrict changes to the requested app/package unless the interface requires coordinated edits.
3. Never hardcode real secrets or credentials; keep `.env.example` updated.
4. Add or change tests with implementation; run lint, typecheck and build.
5. Summarize **added / modified / removed files**, assumptions and unverified checks.
6. Do not modify dependency major versions or add cloud integrations without a reason and approval.
7. Maintain accessibility and `prefers-reduced-motion` when motion is implemented.

## Operational conventions
- Node.js 24 LTS; pnpm via Corepack; single GitHub repository; feature branches + PR.
- Run commands from monorepo root unless docs specify otherwise.
- Never commit `.env`, `node_modules`, generated Prisma Client, built assets, or real guest data.
- Git diff is canonical; generated ZIP manifests are transfer aids, not version control.
