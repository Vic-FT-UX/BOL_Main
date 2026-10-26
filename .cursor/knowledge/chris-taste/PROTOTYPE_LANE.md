# Prototype lane vs demo (HARD RULE)

**Source:** Chris, Oct 2026.

## Demo (`:3000`)

- Shipped product surfaces only.
- **Do not** put unmerged initiatives in demo nav or product routes.
- Example: Daily Races stays **off** `:3000` until Chris explicitly merges.

## Initiative prototype (`:3001` local · same-origin hosted)

- Each design initiative gets its **own URL**:
  - **Local:** `http://127.0.0.1:3001/prototype/<slug>` (`npm run dev:3001`, `PROTOTYPE_LANE=1`)
  - **Hosted (Vercel):** same origin `/prototype/<slug>` — never `127.0.0.1` in prod Links / iframes
- Desk iframe + Open fullscreen point here — never at `/promotions/…` on demo until Merge.
- Local demo middleware 404s `/prototype/*` and unmerged routes unless `PROTOTYPE_LANE=1`. Hosted serves `/prototype/*`.

## Request sign-off vs Final sign-off vs Merge (HARD)

- **Request Chris sign-off** (Requester / designer / PM) = alerts Chris; status `awaiting_signoff`. Does **not** package.
- **Final sign-off** (Owner / Chris only) = package for the requester / dev (BRD / lumen map / prototype on `:3001`). Does **not** put anything on demo `:3000`.
- **Merge** = only when Chris says so — then restore product route + nav on `:3000` (e.g. `/promotions/races`).
- Desk must **not** show a clickable “live demo after sign-off” URL. Preview tab is first.

## Storybook (`:6006` local · `/storybook` hosted)

- Local: `npm run storybook` → `http://127.0.0.1:6006`.
- Hosted desk Links → `/storybook` (Lumen gallery stand-in). Full Storybook stays local unless `NEXT_PUBLIC_STORYBOOK_URL` is a public host.
- Shell / casino stories must import from `apps/live-site/…`, not stale `src/components/lumen` copies.
