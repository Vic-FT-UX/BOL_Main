# Storybook must match demo (:3000)

**Source:** Chris, Oct 2026.

## Rule

Product surfaces in Storybook import from **`apps/live-site`** — same modules as the demo. Do not leave stale `src/components/lumen` copies as the “product” story when live-site has moved on.

## Where to look

1. **`Lumen/★ Demo site`** — compositions (casino / promotions chrome)
2. **`Lumen/Shell/*`** — Product Sidebar, Side Nav, Cashier, Account Sheet, Mobile Dock
3. **`Lumen/Casino/*`** — Lobby, Sub Nav, Banners (live-site imports)

## Not demo

`Lumen/Navigation/*` atoms (Nav Menu, Command, etc.) are design-system primitives — **not** BetOnline shell. The old fake Sidebar (Home/Casino/Sports lucide rail) was removed.

## Static assets

Storybook `staticDirs` must serve `/shell`, `/games`, `/casino`, `/vendot_logos`, `/banners` from live-site `public/` or tiles break.
