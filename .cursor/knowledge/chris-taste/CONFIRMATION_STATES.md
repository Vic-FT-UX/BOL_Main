# Confirmation states — settled preference

**Source:** Chris, join welcome + betslip place confirm critique, Oct 2026.

## Never do this (AI slop)

- Thin “ghost” checkmarks floating alone (soft green stroke, no filled disc).
- Vague copy like **“You’re in”** as the *body* headline when the action was concrete (placed bets, claimed reward, etc.). Join uses “You’re in” only as a **modal chrome title** — the body is **Welcome, {name}! / Your account is ready.**
- Em dashes / AI marketing filler in success screens (“While you wait — …” is OK as a quiet shelf label; don’t dash-stuff headlines).
- Inventing icons when shell already has the mark (`ShellIcon` / Figma under `public/shell/figma/...`).
- Desktop carousels with **no** edge arrows when the rail is a deliberate browse strip inside a panel (betslip cross-sell). Mobile stays swipe-only (`MOBILE_CAROUSELS.md`).

## Do this instead

### Success glyph (join pattern)

Reuse join welcome:

- `size-16` (or `size-14` in tight sheets) **`rounded-full bg-primary`**
- White **`IconCheck`** `stroke={3}` on `text-primary-foreground`
- Spring enter (scale / slight rotate) — same motion family as `JoinWelcomePanel`

Not: muted `bg-success/15` ring with a skinny green tick.

### Copy

- Say what happened in plain product language: **“Bets placed.”** — no extra filler line (“Your selections are live.” was rejected).
- Keep stake / count as secondary muted line: `2 selections · $5.00 to win $34.00`
- Primary CTA **hugs content** (`w-auto`), not full-bleed; real hover darken on primary.
- Primary CTA label matches nav: **My Bets** + **`ShellIcon name="ticket"`** (mobile dock My Bets — **not** `bets` / serrated betslip, which is the open slip mark)
- Secondary: quiet text link **Reuse selection** (no competing button)

### Casino cross-sell in betslip

- DVD / poster tiles (`152/207` art), Lumen card chrome
- **Desktop:** glass edge chevrons (`(hover: hover) and (pointer: fine)` only)
- **Mobile / touch:** swipe only — no arrows

## When correcting yourself

If Chris says a confirm screen looks like slop, re-open **join welcome** and this note before redesigning — do not freestyle a third success language.