import { NextResponse } from 'next/server'
import {
  advanceDesignPipeline,
  advancePackagingPipeline,
  answerQuestion,
  approveAgentJob,
  deleteAgentJob,
  finalizeSignOff,
  getAgentJob,
  postFeedback,
  postMessage,
  readJobPackageFile,
  reopenForRefine,
  requestSignOff,
  type FeedbackImageInput,
} from '@/lib/agent/jobs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/** Cloud refine kick can take a few seconds to start. */
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

async function filesFromForm(form: FormData): Promise<FeedbackImageInput[]> {
  const out: FeedbackImageInput[] = []
  for (const entry of form.getAll('images')) {
    if (!(entry instanceof File) || entry.size === 0) continue
    const buf = Buffer.from(await entry.arrayBuffer())
    out.push({
      buffer: buf,
      mime: entry.type || 'image/png',
      name: entry.name,
    })
  }
  return out
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!checkAuth(request)) return unauthorized()
  const url = new URL(request.url)
  const file = url.searchParams.get('file')
  if (file) {
    const packed = await readJobPackageFile(params.id, file)
    if (!packed) return NextResponse.json({ error: 'File not found' }, { status: 404 })
    return NextResponse.json(packed)
  }

  let job = await getAgentJob(params.id)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  /* Desk poll advances design prep / packaging and streams … lines into chat. */
  if (job.status === 'designing' && !job.artifacts.previewUrl) {
    job = (await advanceDesignPipeline(params.id)) ?? job
  } else if (job.status === 'approved' && !job.artifacts.devDeliveryPath) {
    job = (await advancePackagingPipeline(params.id)) ?? job
  }
  return NextResponse.json({ job })
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!checkAuth(request)) return unauthorized()

  const contentType = request.headers.get('content-type') ?? ''

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const action = String(form.get('action') ?? 'feedback')
      const text = String(form.get('text') ?? '')
      const images = await filesFromForm(form)

      if (action === 'feedback' || action === 'message') {
        const job = await postFeedback(params.id, text, images)
        if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        return NextResponse.json({ job })
      }

      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    let body: {
      action?: string
      questionId?: string
      answer?: string
      text?: string
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (body.action === 'approve' || body.action === 'request_signoff') {
      const job =
        body.action === 'approve'
          ? await approveAgentJob(params.id)
          : await requestSignOff(params.id)
      if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ job })
    }

    if (body.action === 'sign_off' || body.action === 'chris_signoff') {
      const job = await finalizeSignOff(params.id)
      if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ job })
    }

    if (body.action === 'refine' || body.action === 'reopen_refine') {
      const job = await reopenForRefine(params.id)
      if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ job })
    }

    if (body.action === 'delete') {
      const ok = await deleteAgentJob(params.id)
      if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'answer') {
      if (!body.questionId || typeof body.answer !== 'string') {
        return NextResponse.json(
          { error: 'questionId and answer required' },
          { status: 400 },
        )
      }
      const job = await answerQuestion(params.id, body.questionId, body.answer)
      if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ job })
    }

    if (body.action === 'message' || body.action === 'feedback') {
      if (typeof body.text !== 'string') {
        return NextResponse.json({ error: 'text required' }, { status: 400 })
      }
      const job =
        body.action === 'feedback'
          ? await postFeedback(params.id, body.text, [])
          : await postMessage(params.id, body.text)
      if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ job })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
