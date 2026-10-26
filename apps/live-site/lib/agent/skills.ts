import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'

export type AgentSkillGroup =
  | 'skills'
  | 'patterns'
  | 'strategy'
  | 'taste'
  | 'rules'
  | 'constitution'

export type AgentSkillSummary = {
  id: string
  name: string
  description: string
  path: string
  group: AgentSkillGroup
}

export type AgentSkillDetail = AgentSkillSummary & {
  content: string
}

const GROUP_LABEL: Record<AgentSkillGroup, string> = {
  skills: 'Agent skills',
  patterns: 'Patterns',
  strategy: 'Product strategy',
  taste: 'Chris taste',
  rules: 'Cursor rules',
  constitution: 'Constitution',
}

export function skillGroupLabel(group: AgentSkillGroup): string {
  return GROUP_LABEL[group]
}

function repoRoot(): string {
  const cwd = process.cwd()
  if (cwd.includes(`${path.sep}apps${path.sep}live-site`)) {
    return path.resolve(cwd, '../..')
  }
  return cwd
}

/** Bundled kit inside live-site (Vercel deploy has no monorepo `.cursor`). */
function agentKitRoot(): string {
  return path.join(process.cwd(), '.agent-kit')
}

async function dirHasEntries(abs: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(abs)
    return entries.length > 0
  } catch {
    return false
  }
}

/**
 * Prefer monorepo `.cursor` when present (local). Else `.agent-kit` packed for hosted.
 */
async function skillSources(): Promise<{
  skillsDir: string
  strategyDir: string
  tasteDir: string
  rulesDir: string
  constitutionFile: string
  idBase: 'repo' | 'kit'
}> {
  const root = repoRoot()
  const cursorSkills = path.join(root, '.cursor', 'skills')
  if (await dirHasEntries(cursorSkills)) {
    return {
      skillsDir: cursorSkills,
      strategyDir: path.join(root, '.cursor', 'knowledge', 'product-strategy'),
      tasteDir: path.join(root, '.cursor', 'knowledge', 'chris-taste'),
      rulesDir: path.join(root, '.cursor', 'rules'),
      constitutionFile: path.join(root, '.specify', 'memory', 'constitution.md'),
      idBase: 'repo',
    }
  }
  const kit = agentKitRoot()
  return {
    skillsDir: path.join(kit, 'skills'),
    strategyDir: path.join(kit, 'knowledge', 'product-strategy'),
    tasteDir: path.join(kit, 'knowledge', 'chris-taste'),
    rulesDir: path.join(kit, 'rules'),
    constitutionFile: path.join(kit, 'specify', 'memory', 'constitution.md'),
    idBase: 'kit',
  }
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'skill'
  )
}

function parseFrontmatter(raw: string): { name?: string; description?: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return {}
  const block = m[1]
  const name = block.match(/^name:\s*(.+)$/m)?.[1]?.trim()
  const descMatch = block.match(
    /^description:\s*(?:>-?\s*)?([\s\S]*?)(?=\n[a-zA-Z-]+:|\n*$)/m,
  )
  let description = descMatch?.[1]?.trim()
  if (description) {
    description = description
      .replace(/^['"]|['"]$/g, '')
      .replace(/\n\s*/g, ' ')
      .slice(0, 220)
  }
  return { name, description }
}

function firstHeading(raw: string): string | undefined {
  const m = raw.replace(/^---[\s\S]*?---\s*/, '').match(/^#\s+(.+)$/m)
  return m?.[1]?.trim()
}

function firstParagraph(raw: string): string | undefined {
  const body = raw.replace(/^---[\s\S]*?---\s*/, '').replace(/^#.+\n+/, '')
  const para = body
    .split(/\n\n+/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .find((p) => p && !p.startsWith('#') && !p.startsWith('```') && !p.startsWith('|'))
  return para?.slice(0, 220)
}

async function readIfExists(abs: string): Promise<string | null> {
  try {
    return await fs.readFile(abs, 'utf8')
  } catch {
    return null
  }
}

function toRel(abs: string, base?: string): string {
  return path.relative(base ?? repoRoot(), abs).split(path.sep).join('/')
}

/** Repo-relative `r:…` or absolute/home `g:…` — base64url. */
function encodeId(payload: string): string {
  return Buffer.from(payload, 'utf8').toString('base64url')
}

export function decodeSkillId(id: string): { kind: 'repo' | 'global'; path: string } | null {
  try {
    const raw = Buffer.from(id, 'base64url').toString('utf8')
    if (!raw || raw.includes('..')) return null
    if (raw.startsWith('g:')) {
      const p = raw.slice(2)
      if (!p || p.includes('..')) return null
      return { kind: 'global', path: p }
    }
    if (raw.startsWith('r:')) {
      const p = raw.slice(2)
      if (!p || path.isAbsolute(p)) return null
      return { kind: 'repo', path: p }
    }
    /* Legacy ids — treat as repo-relative */
    if (path.isAbsolute(raw)) return null
    return { kind: 'repo', path: raw }
  } catch {
    return null
  }
}

function resolveSkillAbs(decoded: { kind: 'repo' | 'global'; path: string }): string | null {
  if (decoded.kind === 'global') {
    const abs = path.resolve(decoded.path)
    const home = os.homedir()
    const allowed = [
      path.join(home, '.cursor'),
      path.join(home, '.agents'),
    ]
    if (!allowed.some((root) => abs === root || abs.startsWith(root + path.sep))) {
      return null
    }
    return abs
  }
  const candidates = [
    path.resolve(path.join(agentKitRoot(), decoded.path)),
    path.resolve(path.join(process.cwd(), decoded.path)),
    path.resolve(path.join(repoRoot(), decoded.path)),
  ]
  const allowedRoots = [
    path.resolve(agentKitRoot()),
    path.resolve(process.cwd()),
    path.resolve(repoRoot()),
  ]
  for (const abs of candidates) {
    if (
      allowedRoots.some(
        (root) => abs === root || abs.startsWith(root + path.sep),
      )
    ) {
      return abs
    }
  }
  return null
}

async function walkMarkdown(
  absDir: string,
  group: AgentSkillGroup,
  out: AgentSkillSummary[],
  opts?: {
    onlyNames?: RegExp
    skipSkillMd?: boolean
    idKind?: 'repo' | 'global'
    displayRoot?: string
    relBase?: string
  },
) {
  const idKind = opts?.idKind ?? 'repo'
  const relBase = opts?.relBase
  const entries = await fs.readdir(absDir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    const abs = path.join(absDir, entry.name)
    if (entry.isDirectory()) {
      await walkMarkdown(abs, group, out, opts)
      continue
    }
    if (!entry.isFile()) continue
    const lower = entry.name.toLowerCase()
    if (!lower.endsWith('.md') && !lower.endsWith('.mdc')) continue
    if (opts?.onlyNames && !opts.onlyNames.test(entry.name)) continue
    if (opts?.skipSkillMd && lower === 'skill.md') continue

    const raw = await readIfExists(abs)
    if (raw == null) continue
    const meta = parseFrontmatter(raw)
    const name =
      meta.name ||
      firstHeading(raw) ||
      entry.name.replace(/\.(md|mdc)$/i, '')
    const description =
      meta.description || firstParagraph(raw) || 'No description'
    const rel = toRel(abs, relBase)
    const displayPath =
      idKind === 'global'
        ? abs.replace(os.homedir(), '~').split(path.sep).join('/')
        : rel.startsWith('.')
          ? rel
          : `./${rel}`
    const idPayload = idKind === 'global' ? `g:${abs}` : `r:${rel}`
    out.push({
      id: encodeId(idPayload),
      name,
      description,
      path: displayPath,
      group,
    })
  }
}

async function pushSkillDir(
  absDir: string,
  out: AgentSkillSummary[],
  opts: {
    idKind: 'repo' | 'global'
    group?: AgentSkillGroup
    relBase?: string
  },
) {
  const group = opts.group ?? 'skills'
  const relBase = opts.relBase
  const entries = await fs.readdir(absDir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const skillFile = path.join(absDir, entry.name, 'SKILL.md')
    const raw = await readIfExists(skillFile)
    if (raw == null) continue
    const meta = parseFrontmatter(raw)
    const rel = toRel(skillFile, relBase)
    const displayPath =
      opts.idKind === 'global'
        ? skillFile.replace(os.homedir(), '~').split(path.sep).join('/')
        : rel
    const idPayload =
      opts.idKind === 'global' ? `g:${skillFile}` : `r:${rel}`
    out.push({
      id: encodeId(idPayload),
      name: meta.name || entry.name,
      description: meta.description || firstParagraph(raw) || 'No description',
      path: displayPath,
      group,
    })
    await walkMarkdown(path.join(absDir, entry.name), 'patterns', out, {
      skipSkillMd: true,
      idKind: opts.idKind,
      relBase,
    })
  }
}

export async function listAgentSkills(): Promise<AgentSkillSummary[]> {
  const src = await skillSources()
  const skills: AgentSkillSummary[] = []
  const relBase = src.idBase === 'kit' ? agentKitRoot() : repoRoot()

  /* Project skills only — never dump ~/.cursor/skills-cursor into the desk */
  await pushSkillDir(src.skillsDir, skills, {
    idKind: 'repo',
    relBase,
  })

  await walkMarkdown(src.strategyDir, 'strategy', skills, {
    onlyNames: /\.md$/i,
    idKind: 'repo',
    relBase,
  })
  await walkMarkdown(src.tasteDir, 'taste', skills, {
    onlyNames: /\.md$/i,
    idKind: 'repo',
    relBase,
  })

  await walkMarkdown(src.rulesDir, 'rules', skills, {
    onlyNames: /\.mdc$/i,
    idKind: 'repo',
    relBase,
  })

  const cRaw = await readIfExists(src.constitutionFile)
  if (cRaw != null) {
    const rel = toRel(src.constitutionFile, relBase)
    const meta = parseFrontmatter(cRaw)
    skills.push({
      id: encodeId(`r:${rel}`),
      name: meta.name || firstHeading(cRaw) || 'Constitution',
      description: meta.description || firstParagraph(cRaw) || 'Lumen constitution',
      path: rel,
      group: 'constitution',
    })
  }

  const order: AgentSkillGroup[] = [
    'skills',
    'patterns',
    'strategy',
    'taste',
    'rules',
    'constitution',
  ]
  return skills.sort((a, b) => {
    const g = order.indexOf(a.group) - order.indexOf(b.group)
    if (g !== 0) return g
    return a.name.localeCompare(b.name)
  })
}

export async function getAgentSkill(id: string): Promise<AgentSkillDetail | null> {
  const decoded = decodeSkillId(id)
  if (!decoded) return null
  const absResolved = resolveSkillAbs(decoded)
  if (!absResolved) return null

  const raw = await readIfExists(absResolved)
  if (raw == null) return null

  const all = await listAgentSkills()
  const summary = all.find((s) => s.id === id)
  if (summary) {
    return { ...summary, content: raw }
  }

  const meta = parseFrontmatter(raw)
  return {
    id,
    name: meta.name || firstHeading(raw) || path.basename(decoded.path),
    description: meta.description || firstParagraph(raw) || '',
    path: decoded.kind === 'global'
      ? absResolved.replace(os.homedir(), '~')
      : decoded.path,
    group: 'skills',
    content: raw,
  }
}

export async function createAgentSkill(input: {
  name: string
  description: string
}): Promise<AgentSkillSummary> {
  const name = input.name.trim()
  const description = input.description.trim() || 'Design agent skill'
  if (!name) throw new Error('Name is required')

  const idSlug = slugify(name)
  const dir = path.join(repoRoot(), '.cursor', 'skills', idSlug)
  await fs.mkdir(dir, { recursive: true })
  const skillFile = path.join(dir, 'SKILL.md')
  try {
    await fs.access(skillFile)
    throw new Error('Skill already exists')
  } catch (err) {
    if (err instanceof Error && err.message === 'Skill already exists') throw err
  }

  const body = [
    '---',
    `name: ${idSlug}`,
    'description: >-',
    `  ${description}`,
    '---',
    '',
    `# ${name}`,
    '',
    description,
    '',
    '## When to use',
    '',
    '- Add triggers here',
    '',
    '## Instructions',
    '',
    '- Add agent instructions here',
    '',
  ].join('\n')

  await fs.writeFile(skillFile, body, 'utf8')
  const rel = toRel(skillFile)
  return {
    id: encodeId(`r:${rel}`),
    name: idSlug,
    description,
    path: rel,
    group: 'skills',
  }
}
