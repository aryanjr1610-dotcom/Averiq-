import { getSupabase } from '@/lib/supabase'

export type AIMode =
  | 'explain' | 'simplify' | 'teach-from-zero' | 'hint' | 'solve-steps' | 'check-approach'
  | 'create-practice' | 'quiz-me' | 'make-notes' | 'quick-revision' | 'explain-formula'
  | 'explain-derivation' | 'compare-concepts' | 'explain-diagram'

export const AI_MODES: ReadonlyArray<{ mode: AIMode; label: string }> = [
  { mode: 'explain', label: 'Explain' },
  { mode: 'simplify', label: 'Simplify' },
  { mode: 'teach-from-zero', label: 'Teach from zero' },
  { mode: 'hint', label: 'Give a hint' },
  { mode: 'solve-steps', label: 'Solve with steps' },
  { mode: 'check-approach', label: 'Check my approach' },
  { mode: 'create-practice', label: 'Create practice questions' },
  { mode: 'quiz-me', label: 'Quiz me' },
  { mode: 'make-notes', label: 'Make notes' },
  { mode: 'quick-revision', label: 'Quick revision' },
  { mode: 'explain-formula', label: 'Explain formula' },
  { mode: 'explain-derivation', label: 'Explain derivation' },
  { mode: 'compare-concepts', label: 'Compare concepts' },
  { mode: 'explain-diagram', label: 'Explain diagram' },
]

export type StudentContext = {
  classLevel?: number
  board?: string
  stream?: string
  goals?: string[]
  preference?: string
}

export type LearningContext = {
  subject?: string
  chapter?: string
  topic?: string
  lessonId?: string
  blockId?: string
  formulaKey?: string
  derivationStep?: string
  visualizationId?: string
  visualizationParameters?: Record<string, number | string>
  selectedObject?: string
  examKey?: string
  examTopicId?: string
  mode?: string
  // Anatomy-ready (Phase 14) — accepted now, unused until then.
  bodySystem?: string
  organ?: string
  structure?: string
}

export type AIMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  mode?: AIMode
  context?: LearningContext
  failed?: boolean
}

export class AITutorError extends Error {
  readonly retryable: boolean
  constructor(message: string, retryable = true) {
    super(message)
    this.name = 'AITutorError'
    this.retryable = retryable
  }
}

export const MAX_USER_MESSAGE = 4000
export const MAX_SELECTED_CONTENT = 6000

export function clipText(value: string, max: number): string {
  const trimmed = value.trim()
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`
}

/** Cost control: keep only the fields that matter for the current question. */
export function prioritiseContext(context: LearningContext): LearningContext {
  const next: LearningContext = {}
  const keys: Array<keyof LearningContext> = [
    'blockId', 'lessonId', 'topic', 'formulaKey', 'derivationStep', 'visualizationId',
    'visualizationParameters', 'selectedObject', 'chapter', 'subject', 'examKey', 'examTopicId', 'mode',
    'bodySystem', 'organ', 'structure',
  ]
  for (const key of keys) {
    const value = context[key]
    if (value === undefined || value === null || value === '') continue
    if (key === 'derivationStep' && typeof value === 'string') {
      next.derivationStep = clipText(value, 800)
      continue
    }
    Object.assign(next, { [key]: value })
  }
  return next
}

/** The AI Tutor is never available while an exam-mode session is running. */
export function isTutorAllowed(args: { examMode: boolean }): boolean {
  return !args.examMode
}

export type TutorRequest = {
  mode: AIMode
  userMessage: string
  conversationId?: string | null
  persist?: boolean
  studentContext?: StudentContext
  learningContext?: LearningContext
  selectedContent?: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export type TutorReply = { content: string; grounded: boolean; conversationId: string | null; mode: AIMode }

export async function requestTutor(request: TutorRequest, signal?: AbortSignal): Promise<TutorReply> {
  const base = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!base || !anonKey) throw new AITutorError('Averiq AI is not configured.', false)

  const { data } = await getSupabase().auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new AITutorError('Please sign in again to use Averiq AI.', false)

  const body: TutorRequest = {
    ...request,
    userMessage: clipText(request.userMessage, MAX_USER_MESSAGE),
    selectedContent: request.selectedContent ? clipText(request.selectedContent, MAX_SELECTED_CONTENT) : undefined,
    learningContext: request.learningContext ? prioritiseContext(request.learningContext) : undefined,
    history: (request.history ?? []).slice(-6),
  }

  let response: Response
  try {
    response = await fetch(`${base}/functions/v1/ai-tutor`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new AITutorError('You appear to be offline. Try again.')
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    const message = payload.error ?? 'Averiq AI is temporarily unavailable. Try again.'
    throw new AITutorError(message, response.status !== 401 && response.status !== 503)
  }

  const payload = (await response.json()) as Partial<TutorReply>
  if (!payload.content) throw new AITutorError('Averiq AI returned an empty response. Try again.')
  return {
    content: payload.content,
    grounded: payload.grounded === true,
    conversationId: payload.conversationId ?? null,
    mode: payload.mode ?? request.mode,
  }
}
