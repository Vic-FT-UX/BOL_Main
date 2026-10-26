/**
 * One SpecKit pipe: BRD → design mock/refine → sign-off → dev delivery → (dev agents).
 * `live` is post–dev-agent ship; Design Agent stops at `ready_for_dev` / delivery.
 * See `.cursor/knowledge/chris-taste/PIPELINE.md`.
 */
export type AgentJobStatus =
  | 'received'
  | 'speccing'
  | 'designing'
  | 'preview_ready'
  | 'needs_review'
  /** Requester liked it — waiting for Chris final sign-off (not packaged yet). */
  | 'awaiting_signoff'
  | 'approved'
  | 'ready_for_dev'
  | 'live'
  | 'failed'

export type AgentJobSurface =
  | 'Rewards'
  | 'Marketing'
  | 'Casino'
  | 'Sports'
  | 'Account'
  | 'Promotions'
  | 'Other'

/** One master design agent + you. */
export type AgentRoleId = 'design' | 'you'

export type AgentMessage = {
  id: string
  role: AgentRoleId
  text: string
  createdAt: string
  /** Public URLs for refine screenshots (`/design-agent/feedback/...`). */
  images?: string[]
}

export type AgentScreen = {
  id: string
  label: string
  /** Preview / screenshot URL when available */
  src?: string
  note?: string
}

export type AgentQuestion = {
  id: string
  agent: AgentRoleId
  text: string
  options?: string[]
  answer?: string
  createdAt: string
}

export type AgentJob = {
  id: string
  slug: string
  title: string
  surface: AgentJobSurface
  kind: 'feature' | 'component'
  brief: string
  status: AgentJobStatus
  createdAt: string
  updatedAt: string
  /** Honest status line — never fake success. */
  note: string
  sourceFile?: string
  artifacts: {
    specPath?: string
    brdPath?: string
    previewUrl?: string
    /** Package for dev agents after design sign-off */
    devDeliveryPath?: string
    /** Repo-relative files in the handoff package (shown on desk). */
    packageFiles?: string[]
    liveUrl?: string
    /** Cursor cloud agent id (`bc-…`) when desk kicked a build. */
    cursorAgentId?: string
    /** Cursor agents dashboard URL for that run. */
    cursorAgentUrl?: string
    /** Last cloud kick error (shown in chat if kick failed). */
    cursorKickError?: string
  }
  questions: AgentQuestion[]
  messages: AgentMessage[]
  screens: AgentScreen[]
  /** SpecKit / design progress index — driven by desk poll; surfaced in chat. */
  pipelineStep?: number
  /** Dev-delivery packaging index after Approve — streams … lines in chat. */
  packagingStep?: number
  /** Isolates this Approve packaging run so … lines aren’t skipped as duplicates. */
  packagingRunId?: string
}

export type CreateAgentJobInput = {
  title: string
  brief: string
  surface?: AgentJobSurface
  kind?: 'feature' | 'component'
  sourceFile?: string
  /** Screenshots for the agent to reference (saved under design-agent/references). */
  referenceImages?: Array<{ buffer: Buffer; mime: string; name?: string }>
}

export const DESIGN_AGENT = {
  id: 'design' as const,
  name: 'Design agent',
  role: 'Master',
  /** Hot pink — Design agent app only, never BetOnline brand red. */
  color: '#ff2d95',
}

export const AGENT_SURFACES: AgentJobSurface[] = [
  'Rewards',
  'Marketing',
  'Casino',
  'Sports',
  'Account',
  'Promotions',
  'Other',
]

export const STAGE_ORDER: AgentJobStatus[] = [
  'received',
  'speccing',
  'designing',
  'preview_ready',
  'needs_review',
  'awaiting_signoff',
  'approved',
  'ready_for_dev',
  'live',
]

export function openQuestions(job: AgentJob): AgentQuestion[] {
  return (job.questions ?? []).filter((q) => !q.answer?.trim())
}

export function needsAttention(job: AgentJob): boolean {
  if (openQuestions(job).length > 0) return true
  return (
    job.status === 'needs_review' ||
    job.status === 'preview_ready' ||
    job.status === 'awaiting_signoff' ||
    job.status === 'received' ||
    job.status === 'speccing'
  )
}

/** Map legacy multi-agent roles → single design agent. */
export function asDesignRole(role: string): AgentRoleId {
  return role === 'you' ? 'you' : 'design'
}
