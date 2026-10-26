/**
 * Design-lane prototypes:
 * - Local: own server `:3001` (`PROTOTYPE_LANE=1`) — never demo `:3000` until Merge.
 * - Hosted (Vercel): same origin `/prototype/<slug>` — one deploy serves desk + previews.
 */

export type PrototypeEntry = {
  /** Product route after handoff (live demo site). */
  livePath: string
  /** Short label for the prototype chrome bar. */
  label: string
}

const REGISTRY: Record<string, PrototypeEntry> = {
  '001-daily-races-page': {
    livePath: '/promotions/races',
    label: 'Daily Races',
  },
}

function isHostedDeploy(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.NEXT_PUBLIC_VERCEL_ENV ||
      process.env.VERCEL_ENV,
  )
}

/** Initiative lane origin — empty string = same host (relative URLs). */
export function prototypeOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_PROTOTYPE_ORIGIN?.trim() ||
    process.env.PUBLIC_PROTOTYPE_ORIGIN?.trim() ||
    ''
  if (raw) {
    /* Never force loopback on a hosted build even if env was copied from local. */
    if (
      isHostedDeploy() &&
      (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(raw) ||
        raw.includes('127.0.0.1') ||
        raw.includes('localhost'))
    ) {
      return ''
    }
    return raw.replace(/\/$/, '')
  }
  if (isHostedDeploy()) return ''
  return 'http://127.0.0.1:3001'
}

/** Design-lane URL for desk iframe + Open fullscreen. */
export function prototypePath(slug: string): string {
  const origin = prototypeOrigin()
  const path = `/prototype/${slug}`
  return origin ? `${origin}${path}` : path
}

/** Rewrite any stored loopback preview to the current env’s prototype URL. */
export function normalizePrototypeUrl(
  slug: string,
  stored?: string | null,
): string {
  if (!stored) return prototypePath(slug)
  if (
    isHostedDeploy() &&
    (stored.includes('127.0.0.1') || stored.includes('localhost'))
  ) {
    return prototypePath(slug)
  }
  /* Prefer path-only on hosted so aliases (*.vercel.app) always work. */
  if (isHostedDeploy() && stored.includes('/prototype/')) {
    return prototypePath(slug)
  }
  return stored
}

export function livePathForSlug(slug: string): string | undefined {
  return REGISTRY[slug]?.livePath
}

export function prototypeEntry(slug: string): PrototypeEntry | undefined {
  return REGISTRY[slug]
}

/** Guess a chrome label from slug when not in the hard registry. */
export function prototypeLabel(slug: string): string {
  const entry = REGISTRY[slug]
  if (entry) return entry.label
  return slug
    .replace(/^\d+-/, '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function looksLikeBenefitsInitiative(slug: string, title?: string, brief?: string): boolean {
  const hay = `${slug} ${title ?? ''} ${brief ?? ''}`.toLowerCase()
  /* Catch typos: benifits / beneifits / benefits */
  return /ben[ei]+f[ei]?t?s?/.test(hay)
}

/** Infer nav / route from BRD so we don’t ask “where?” when it’s already clear. */
export function inferRouteFromBrief(
  title: string,
  brief: string,
  surface?: string,
): string | null {
  const hay = `${title}\n${brief}\n${surface ?? ''}`.toLowerCase()
  if (/vip\s*hub/.test(hay) && /ben[ei]+f[ei]?t?s?/.test(hay)) {
    return 'VIP Hub → Benefits tab'
  }
  if (/vip\s*hub/.test(hay)) return 'VIP Hub'
  if (/my\s*bonus/.test(hay)) return 'Promotions → My Bonus'
  if (/daily\s*race|25k/.test(hay)) return 'VIP Hub → $25k Daily Race / Promotions → Races'
  if (/refer/.test(hay)) return 'Promotions → Refer a Friend'
  return null
}
