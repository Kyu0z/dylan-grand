# Dylan Grand Hotel — Customer Site (UI v1)

Next.js App Router + TypeScript + Tailwind CSS v4; luxury editorial concept.

## Pages

| Spec | Route | Page |
|---|---|---|
| US-01 | `/` | Hotel homepage / philosophy / amenities / policies |
| US-02 | `/rooms` | Room list, filters, gallery, comparisons, wishlist |
| US-03 | `/availability` | Search dates, guest count, illustrative prices and inventory |
| US-04 | `/booking` | Four-step frontend reservation wizard |
| US-06 | `/reservations` | Demo booking management, changes, cancellation, lookup and export |
| US-07 | `/account` | Demo profile, sign in/register/reset UI and saved rooms |
| US-08 | `/experiences` | Services, review UI, contact and scripted concierge |

US-05 is **not** implemented in this UI batch. The original approved prototype included 01, 02, 03, 04, 06, 07 and 08. Backend, payment, real user authentication and hotel operations are out of scope.

## Run

From monorepo root (after dependencies are installed):

```powershell
pnpm install
pnpm dev:web
```

Visit `http://localhost:3000`.

## Theme and design tokens

- Source: `src/app/globals.css`.
- Primitive palette is defined in `:root`, with a dark alternate in `[data-theme='night']`.
- Semantic Tailwind tokens are exposed through `@theme inline`, e.g. `bg-surface`, `text-ink`, `border-line`, `text-gold`, `font-display`.
- Never introduce page-specific hex colors when the appropriate semantic token exists.
- Theme toggle in the global header persists `dylan-theme` to localStorage.
- Motion uses `--motion-ease`, `--motion-duration`, transitions, scroll reveal, and `prefers-reduced-motion`.

## Demo state

Room and concept photos: `src/lib/data.ts`.

- Stay selection persists in browser `localStorage`.
- Reserving a room creates an **illustrative** booking with a `DGH-DEMO-...` reference.
- US-06 reads and updates these local demo bookings.
- US-07 is not real login/auth; passwords entered in the form are neither checked nor stored. **Do not type a real password or personal information.**
- Review submissions and wishlists are browser-local.
- Payment, refunds, cancellation fees, email delivery and API requests are **not** executed.

## Photography

Photos load from `images.unsplash.com` (Internet required). Each room type has a distinct 3-photo gallery; repeated use of the same room photo across different pages is intentional for consistent identity. These are generic licensed photo references, **not verified images of a real Dylan Grand Hotel property**. Do not present them as a real hotel's rooms.

## Verification

`node apps/web/tools/check-ui.mjs` verifies route files, theme tokens and unique photo IDs. Run `pnpm --filter @dylan/web typecheck`, `pnpm --filter @dylan/web lint`, `pnpm --filter @dylan/web build` locally after installing dependencies.
