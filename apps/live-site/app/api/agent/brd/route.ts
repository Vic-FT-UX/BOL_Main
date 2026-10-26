import { NextResponse } from 'next/server'
import {
  createAgentJob,
  extractBriefFromUpload,
  listAgentJobs,
  type FeedbackImageInput,
} from '@/lib/agent/jobs'
import type { AgentJobSurface } from '@/lib/agent/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/** Cloud agent kick + Blob writes on create. */
export const maxDuration = 60

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function checkAuth(request: Request): boolean {
  const token = process.env.AGENT_INTAKE_TOKEN
  if (!token) return true
  const header = request.headers.get('authorization') ?? ''
  return header === `Bearer ${token}`
}

function isImageFile(name: string, mime: string): boolean {
  if (mime.startsWith('image/')) return true
  return /\.(png|jpe?g|webp|gif)$/i.test(name)
}

export async function GET(request: Request) {
  if (!checkAuth(request)) return unauthorized()
  const jobs = await listAgentJobs()
  return NextResponse.json({ jobs })
}

export async function POST(request: Request) {
  if (!checkAuth(request)) return unauthorized()

  const contentType = request.headers.get('content-type') ?? ''

  try {
    let title = ''
    let brief = ''
    let surface: AgentJobSurface = 'Other'
    let kind: 'feature' | 'component' = 'feature'
    let sourceFile: string | undefined
    const referenceImages: FeedbackImageInput[] = []

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      title = String(form.get('title') ?? '')
      surface = (String(form.get('surface') ?? 'Other') as AgentJobSurface) || 'Other'
      kind = form.get('kind') === 'component' ? 'component' : 'feature'
      brief = String(form.get('brief') ?? '')

      const doc = form.get('file')
      if (doc && typeof doc !== 'string' && 'arrayBuffer' in doc) {
        const f = doc as File
        sourceFile = f.name
        const buf = Buffer.from(await f.arrayBuffer())
        if (isImageFile(f.name, f.type)) {
          referenceImages.push({
            buffer: buf,
            mime: f.type || 'image/png',
            name: f.name,
          })
          if (!brief.trim()) {
            brief = await extractBriefFromUpload(f.name, buf)
          }
        } else {
          const extracted = await extractBriefFromUpload(f.name, buf)
          if (!brief.trim()) brief = extracted
          else brief = `${brief.trim()}\n\n---\n\n${extracted}`
        }
        if (!title.trim()) {
          title = f.name.replace(/\.(pdf|md|txt|markdown|png|jpe?g|webp|gif)$/i, '')
        }
      }

      for (const entry of form.getAll('images')) {
        if (!entry || typeof entry === 'string' || !('arrayBuffer' in entry)) continue
        const f = entry as File
        if (!isImageFile(f.name, f.type)) continue
        referenceImages.push({
          buffer: Buffer.from(await f.arrayBuffer()),
          mime: f.type || 'image/png',
          name: f.name,
        })
      }
      if (!title.trim() && referenceImages[0]?.name) {
        title = referenceImages[0].name.replace(/\.(png|jpe?g|webp|gif)$/i, '')
      }
      if (!brief.trim() && referenceImages.length > 0) {
        brief = `Design from ${referenceImages.length} reference screenshot${
          referenceImages.length === 1 ? '' : 's'
        }. See attached images.`
      }
    } else {
      const body = (await request.json()) as {
        title?: string
        brief?: string
        surface?: AgentJobSurface
        kind?: 'feature' | 'component'
      }
      title = body.title ?? ''
      brief = body.brief ?? ''
      surface = body.surface ?? 'Other'
      kind = body.kind ?? 'feature'
    }

    const job = await createAgentJob({
      title,
      brief,
      surface,
      kind,
      sourceFile,
      referenceImages,
    })
    return NextResponse.json(
      { id: job.id, slug: job.slug, status: job.status, job },
      { status: 201 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create job'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
