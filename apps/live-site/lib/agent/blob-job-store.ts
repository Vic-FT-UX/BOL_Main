/**
 * Durable SpecKit job store for Vercel (private Blob).
 * /tmp alone is per-instance ephemeral — desk create/list must use Blob on prod.
 */
import { del, get, list, put } from '@vercel/blob'
import type { AgentJob } from '@/lib/agent/types'

function blobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim())
}

function jobPathname(slug: string): string {
  return `design-agent/specs/${slug}/job.json`
}

function textPathname(slug: string, file: string): string {
  return `design-agent/specs/${slug}/${file}`
}

function assetPathname(
  kind: 'feedback' | 'references',
  slug: string,
  file: string,
): string {
  return `design-agent/${kind}/${slug}/${file}`
}

async function streamToBuffer(
  stream: ReadableStream<Uint8Array>,
): Promise<Buffer> {
  const res = new Response(stream)
  const ab = await res.arrayBuffer()
  return Buffer.from(ab)
}

async function readText(pathname: string): Promise<string | null> {
  if (!blobEnabled()) return null
  try {
    const result = await get(pathname, { access: 'private', useCache: false })
    if (result.statusCode !== 200 || !result.stream) return null
    return (await streamToBuffer(result.stream)).toString('utf8')
  } catch {
    return null
  }
}

async function writeText(
  pathname: string,
  body: string,
  contentType: string,
): Promise<void> {
  if (!blobEnabled()) return
  await put(pathname, body, {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
  })
}

export function isBlobJobStoreEnabled(): boolean {
  return blobEnabled()
}

export async function blobPutJob(job: AgentJob): Promise<void> {
  await writeText(jobPathname(job.slug), JSON.stringify(job, null, 2), 'application/json')
}

export async function blobGetJob(slug: string): Promise<AgentJob | null> {
  const raw = await readText(jobPathname(slug))
  if (!raw) return null
  try {
    return JSON.parse(raw) as AgentJob
  } catch {
    return null
  }
}

export async function blobListJobs(): Promise<AgentJob[]> {
  if (!blobEnabled()) return []
  const jobs: AgentJob[] = []
  let cursor: string | undefined
  do {
    const page = await list({
      prefix: 'design-agent/specs/',
      cursor,
      limit: 1000,
    })
    for (const item of page.blobs) {
      if (!item.pathname.endsWith('/job.json')) continue
      const raw = await readText(item.pathname)
      if (!raw) continue
      try {
        jobs.push(JSON.parse(raw) as AgentJob)
      } catch {
        /* skip bad json */
      }
    }
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
  return jobs
}

export async function blobDeleteJob(slug: string): Promise<void> {
  if (!blobEnabled()) return
  try {
    const page = await list({
      prefix: `design-agent/specs/${slug}/`,
      limit: 1000,
    })
    const urls = page.blobs.map((b) => b.url)
    if (urls.length) await del(urls)
  } catch {
    /* ignore */
  }
}

export async function blobPutSpecFile(
  slug: string,
  file: string,
  body: string,
): Promise<void> {
  const ct = file.endsWith('.json')
    ? 'application/json'
    : 'text/markdown; charset=utf-8'
  await writeText(textPathname(slug, file), body, ct)
}

export async function blobAppendFeedback(
  slug: string,
  block: string,
): Promise<void> {
  const existing = (await readText(textPathname(slug, 'feedback.md'))) ?? ''
  await blobPutSpecFile(slug, 'feedback.md', `${existing}${block}`)
}

export async function blobPutAsset(
  kind: 'feedback' | 'references',
  slug: string,
  file: string,
  buffer: Buffer,
  mime: string,
): Promise<string> {
  if (!blobEnabled()) {
    throw new Error('BLOB_READ_WRITE_TOKEN missing')
  }
  const pathname = assetPathname(kind, slug, file)
  await put(pathname, buffer, {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: mime || 'application/octet-stream',
  })
  return `/api/agent/asset/${kind}/${encodeURIComponent(slug)}/${encodeURIComponent(file)}`
}

export async function blobReadAsset(
  kind: 'feedback' | 'references',
  slug: string,
  file: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!blobEnabled()) return null
  try {
    const result = await get(assetPathname(kind, slug, file), {
      access: 'private',
      useCache: false,
    })
    if (result.statusCode !== 200 || !result.stream) return null
    const buffer = await streamToBuffer(result.stream)
    const lower = file.toLowerCase()
    const contentType = lower.endsWith('.png')
      ? 'image/png'
      : lower.endsWith('.webp')
        ? 'image/webp'
        : lower.endsWith('.gif')
          ? 'image/gif'
          : 'image/jpeg'
    return { buffer, contentType }
  } catch {
    return null
  }
}
