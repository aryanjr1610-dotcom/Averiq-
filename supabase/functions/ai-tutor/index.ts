// Deno Edge Function. Provider credentials are read server-side from Supabase Vault.
// Only models explicitly present in ai_model_pool with billing_allowed=false can be used.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Mode =
  | 'explain' | 'simplify' | 'teach-from-zero' | 'hint' | 'solve-steps' | 'check-approach'
  | 'create-practice' | 'quiz-me' | 'make-notes' | 'quick-revision' | 'explain-formula'
  | 'explain-derivation' | 'compare-concepts' | 'explain-diagram'

const MODE_INSTRUCTIONS: Record<Mode, string> = {
  explain: 'Explain the concept clearly with reasoning, then a short example.',
  simplify: 'Re-explain in simpler language without losing correctness.',
  'teach-from-zero': 'Assume no prior knowledge. Build up from prerequisites in order.',
  hint: 'Give ONE next nudge only. Never reveal the final answer.',
  'solve-steps': 'Show the reasoning step by step, stating why each step is valid.',
  'check-approach': 'Review the student approach: what is right, what is missing, what to fix. Do not award official marks.',
  'create-practice': 'Write a few practice questions with answers. Mark them clearly as practice generated for this student only.',
  'quiz-me': 'Ask one question at a time and wait for the answer.',
  'make-notes': 'Produce compact personal study notes from the provided context only.',
  'quick-revision': 'Produce a condensed recall list: definitions, formulae, traps.',
  'explain-formula': 'Explain the formula: meaning, each symbol with units, conditions of validity, one use.',
  'explain-derivation': 'Explain only the requested derivation step and why it follows.',
  'compare-concepts': 'Compare the concepts in a short structured way, including when each applies.',
  'explain-diagram': 'Describe what the visual shows and what changes when parameters change.',
}

const BASE_PROMPT = `You are Averiq Tutor, an academic tutor inside a school and competitive-exam study app.
Rules:
- Use the provided COURSE CONTEXT as the primary source. If it does not support a syllabus-specific claim, say what is general knowledge and what you are unsure about.
- Never claim to be an official board or exam authority, and never invent past-year-question metadata.
- Match the student's academic level. Never use childish language.
- Write readable prose with short headings where useful. Use LaTeX between single dollar signs for inline maths and double dollar signs for display maths. Never output HTML.`

const MAX_MESSAGE = 4000
const MAX_SELECTED = 6000
const MAX_GROUNDING = 9000
const MAX_MODEL_ATTEMPTS = 5
const PROVIDER_TIMEOUT_MS = 15_000

type Payload = {
  mode?: string
  conversationId?: string | null
  userMessage?: string
  persist?: boolean
  studentContext?: { classLevel?: number; board?: string; stream?: string; goals?: string[]; preference?: string }
  learningContext?: {
    subject?: string; chapter?: string; topic?: string; lessonId?: string; blockId?: string
    formulaKey?: string; derivationStep?: string; visualizationId?: string
    visualizationParameters?: Record<string, number | string>
    selectedObject?: string; examKey?: string; examTopicId?: string; mode?: string
  }
  selectedContent?: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
}

type ModelRow = {
  id: string
  provider: string
  model_id: string
  endpoint_url: string
  secret_name: string
  priority: number
  enabled: boolean
  billing_allowed: boolean
  failure_count: number
  cooldown_until: string | null
}

type AttemptStatus = 'success' | 'retryable_error' | 'fatal_error' | 'timeout'
type AdminClient = ReturnType<typeof createClient>

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const clip = (value: string, max: number) => (value.length <= max ? value : `${value.slice(0, max)}…`)

function levelInstruction(classLevel?: number, examKey?: string): string {
  if (examKey) {
    const key = examKey.toLowerCase()
    if (key === 'jee') return 'Target JEE: deeper mathematics, multi-step problem solving, vector reasoning.'
    if (key === 'neet') return 'Target NEET: precise concepts, factual accuracy, fast application.'
    if (key === 'nda') return 'Target NDA: accurate fundamentals with clear, efficient working.'
  }
  if (!classLevel) return 'Target a senior secondary student.'
  if (classLevel <= 8) return 'Target Classes 6-8: plain language, correct terminology, concrete examples.'
  if (classLevel <= 10) return 'Target Classes 9-10: standard board terminology and structured answers.'
  return 'Target Classes 11-12: formal subject terminology and full derivational reasoning.'
}

function collectText(node: unknown, out: string[], depth = 0): void {
  if (depth > 6 || out.join(' ').length > MAX_GROUNDING) return
  if (typeof node === 'string') {
    if (node.trim().length > 0) out.push(node.trim())
    return
  }
  if (Array.isArray(node)) {
    for (const item of node) collectText(item, out, depth + 1)
    return
  }
  if (node && typeof node === 'object') {
    for (const value of Object.values(node as Record<string, unknown>)) collectText(value, out, depth + 1)
  }
}

function parseProviderPayload(raw: string): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return raw
  }
}

function providerErrorText(payload: unknown): string {
  if (typeof payload === 'string') return clip(payload, 1200)
  if (!payload || typeof payload !== 'object') return ''
  const record = payload as Record<string, unknown>
  const error = record.error
  if (typeof error === 'string') return clip(error, 1200)
  if (error && typeof error === 'object') {
    const errorRecord = error as Record<string, unknown>
    const message = typeof errorRecord.message === 'string' ? errorRecord.message : ''
    const code = typeof errorRecord.code === 'string' ? errorRecord.code : ''
    return clip(`${code} ${message}`.trim(), 1200)
  }
  const message = typeof record.message === 'string' ? record.message : ''
  return clip(message, 1200)
}

function extractAnswer(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const choices = (payload as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) return ''
  const first = choices[0]
  if (!first || typeof first !== 'object') return ''
  const message = (first as { message?: unknown }).message
  if (!message || typeof message !== 'object') return ''
  const content = (message as { content?: unknown }).content
  return typeof content === 'string' ? content.trim() : ''
}

function classifyProviderFailure(status: number, text: string): { retryable: boolean; code: string } {
  const lower = text.toLowerCase()
  if (status === 401) return { retryable: false, code: 'provider_auth' }
  if (status === 402) return { retryable: true, code: 'quota_or_billing_limit' }
  if ([408, 425, 429, 500, 502, 503, 504].includes(status)) {
    return { retryable: true, code: status === 429 ? 'rate_limit' : `http_${status}` }
  }

  const modelSpecific = [
    'rate limit', 'quota', 'limit reached', 'token limit', 'capacity', 'overloaded',
    'model unavailable', 'model is unavailable', 'model not available', 'no endpoints',
    'free tier', 'free limit', 'model not found', 'unknown model',
  ].some((needle) => lower.includes(needle))

  if ([400, 403, 404].includes(status) && modelSpecific) {
    return { retryable: true, code: status === 404 ? 'model_not_found' : 'model_unavailable' }
  }
  return { retryable: false, code: `http_${status}` }
}

function cooldownMs(status: number | null, retryAfter: string | null): number {
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, 60 * 60_000)
    const date = Date.parse(retryAfter)
    if (Number.isFinite(date)) return Math.min(Math.max(date - Date.now(), 30_000), 60 * 60_000)
  }
  if (status === 402 || status === 429) return 10 * 60_000
  if (status === 400 || status === 403 || status === 404) return 60 * 60_000
  if (status === 503 || status === 504) return 2 * 60_000
  return 60_000
}

async function recordAttempt(
  admin: AdminClient,
  userId: string,
  model: ModelRow,
  status: AttemptStatus,
  latencyMs: number,
  httpStatus: number | null,
  errorCode: string | null,
) {
  const { error } = await admin.from('ai_model_attempts').insert({
    user_id: userId,
    model_pool_id: model.id,
    provider: model.provider,
    model_id: model.model_id,
    status,
    http_status: httpStatus,
    latency_ms: latencyMs,
    error_code: errorCode,
  })
  if (error) console.error('ai_model_attempts insert failed', error.code)
}

async function markModelSuccess(admin: AdminClient, model: ModelRow) {
  const now = new Date().toISOString()
  await admin.from('ai_model_pool').update({
    failure_count: 0,
    cooldown_until: null,
    last_success_at: now,
    updated_at: now,
  }).eq('id', model.id)
}

async function markModelFailure(
  admin: AdminClient,
  model: ModelRow,
  status: number | null,
  retryAfter: string | null,
) {
  const now = new Date()
  await admin.from('ai_model_pool').update({
    failure_count: model.failure_count + 1,
    cooldown_until: new Date(now.getTime() + cooldownMs(status, retryAfter)).toISOString(),
    last_failure_at: now.toISOString(),
    updated_at: now.toISOString(),
  }).eq('id', model.id)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return json({ error: 'Averiq AI is not configured.' }, 503)

  const authHeader = request.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return json({ error: 'Not signed in.' }, 401)

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  const user = userData?.user
  if (userError || !user) return json({ error: 'Not signed in.' }, 401)

  let payload: Payload
  try {
    payload = (await request.json()) as Payload
  } catch {
    return json({ error: 'Invalid request.' }, 400)
  }

  const mode = (payload.mode ?? 'explain') as Mode
  if (!(mode in MODE_INSTRUCTIONS)) return json({ error: 'Unknown mode.' }, 400)

  const userMessage = clip((payload.userMessage ?? '').trim(), MAX_MESSAGE)
  if (userMessage.length === 0) return json({ error: 'Message is empty.' }, 400)

  const minuteAgo = new Date(Date.now() - 60_000).toISOString()
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString()
  const [{ count: recent }, { count: daily }] = await Promise.all([
    admin.from('ai_usage_events').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', minuteAgo),
    admin.from('ai_usage_events').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', dayAgo),
  ])
  if ((recent ?? 0) >= 6) return json({ error: 'Too many requests. Wait a few seconds.' }, 429)
  if ((daily ?? 0) >= 200) return json({ error: 'Daily AI limit reached.' }, 429)

  const learning = payload.learningContext ?? {}
  let grounding = ''
  let grounded = false
  if (learning.lessonId) {
    const { data: version } = await admin
      .from('lesson_version_content_v3')
      .select('version, status, blocks, key_terms, formulas, examples, exercises')
      .eq('lesson_id', learning.lessonId)
      .eq('status', 'published')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (version) {
      const blocks = Array.isArray(version.blocks) ? version.blocks as Array<Record<string, unknown>> : []
      const target = learning.blockId ? blocks.filter((block) => block.id === learning.blockId) : blocks.slice(0, 12)
      const parts: string[] = []
      collectText({
        blocks: target.length > 0 ? target : blocks.slice(0, 8),
        keyTerms: version.key_terms,
        formulas: version.formulas,
        examples: version.examples,
        exercises: version.exercises,
      }, parts)
      grounding = clip(parts.join('\n'), MAX_GROUNDING)
      grounded = grounding.length > 0
    }
  }

  const student = payload.studentContext ?? {}
  const contextLines = [
    student.classLevel ? `Class: ${student.classLevel}` : '',
    student.board ? `Board: ${student.board}` : '',
    student.stream ? `Stream: ${student.stream}` : '',
    student.goals?.length ? `Competitive goals: ${student.goals.join(', ')}` : '',
    student.preference ? `Learning preference: ${student.preference}` : '',
    learning.subject ? `Subject: ${learning.subject}` : '',
    learning.chapter ? `Chapter: ${learning.chapter}` : '',
    learning.topic ? `Topic: ${learning.topic}` : '',
    learning.formulaKey ? `Formula: ${learning.formulaKey}` : '',
    learning.derivationStep ? `Derivation step: ${clip(learning.derivationStep, 800)}` : '',
    learning.visualizationId ? `Visualisation: ${learning.visualizationId}` : '',
    learning.visualizationParameters ? `Visual parameters: ${clip(JSON.stringify(learning.visualizationParameters), 600)}` : '',
    learning.selectedObject ? `Selected object: ${learning.selectedObject}` : '',
    learning.examKey ? `Exam focus: ${learning.examKey.toUpperCase()}` : '',
    learning.mode ? `Reading mode: ${learning.mode}` : '',
  ].filter((line) => line.length > 0)

  const selected = clip((payload.selectedContent ?? '').trim(), MAX_SELECTED)
  const system = [
    BASE_PROMPT,
    levelInstruction(student.classLevel, learning.examKey),
    `TASK: ${MODE_INSTRUCTIONS[mode]}`,
    contextLines.length > 0 ? `STUDENT CONTEXT:\n${contextLines.join('\n')}` : '',
    selected ? `SELECTED CONTENT:\n${selected}` : '',
    grounding ? `COURSE CONTEXT (reviewed Averiq content):\n${grounding}` : 'COURSE CONTEXT: none retrieved. Say so if a syllabus-specific claim is needed.',
  ].filter((part) => part.length > 0).join('\n\n')

  const history = (payload.history ?? []).slice(-6).map((item) => ({
    role: item.role,
    content: clip(item.content, 2000),
  }))

  const { data: modelRows, error: modelError } = await admin
    .from('ai_model_pool')
    .select('id, provider, model_id, endpoint_url, secret_name, priority, enabled, billing_allowed, failure_count, cooldown_until')
    .eq('enabled', true)
    .eq('billing_allowed', false)
    .order('priority', { ascending: true })

  if (modelError) {
    console.error('model pool read failed', modelError.code)
    return json({ error: 'Averiq AI is temporarily unavailable. Try again.' }, 503)
  }

  const nowMs = Date.now()
  const models = ((modelRows ?? []) as ModelRow[])
    .filter((model) => !model.cooldown_until || Date.parse(model.cooldown_until) <= nowMs)
    .slice(0, MAX_MODEL_ATTEMPTS)

  if (models.length === 0) {
    return json({ error: 'All free AI models are temporarily cooling down. Try again shortly.' }, 503)
  }

  const secretCache = new Map<string, string>()
  const fallbackChain: Array<{ model: string; status: AttemptStatus; httpStatus: number | null }> = []
  const requestStarted = Date.now()
  let answer = ''
  let modelUsed: ModelRow | null = null
  let fatalProviderConfig = false

  for (const model of models) {
    let providerKey = secretCache.get(model.secret_name)
    if (!providerKey) {
      const { data: secret, error: secretError } = await admin.rpc('get_ai_provider_secret_v1', { p_name: model.secret_name })
      if (secretError || typeof secret !== 'string' || secret.length === 0) {
        console.error('provider secret unavailable', model.provider, secretError?.code ?? 'missing')
        fatalProviderConfig = true
        break
      }
      providerKey = secret
      secretCache.set(model.secret_name, secret)
    }

    const attemptStarted = Date.now()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS)

    try {
      const response = await fetch(model.endpoint_url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${providerKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.model_id,
          temperature: 0.3,
          max_tokens: 1200,
          messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: userMessage }],
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      const raw = await response.text()
      const providerPayload = parseProviderPayload(raw)
      const latencyMs = Date.now() - attemptStarted

      if (response.ok) {
        const candidate = extractAnswer(providerPayload)
        if (candidate) {
          answer = candidate
          modelUsed = model
          fallbackChain.push({ model: model.model_id, status: 'success', httpStatus: response.status })
          await recordAttempt(admin, user.id, model, 'success', latencyMs, response.status, null)
          await markModelSuccess(admin, model)
          break
        }

        fallbackChain.push({ model: model.model_id, status: 'retryable_error', httpStatus: response.status })
        await recordAttempt(admin, user.id, model, 'retryable_error', latencyMs, response.status, 'empty_response')
        await markModelFailure(admin, model, response.status, response.headers.get('retry-after'))
        continue
      }

      const errorText = providerErrorText(providerPayload)
      const classification = classifyProviderFailure(response.status, errorText)
      const attemptStatus: AttemptStatus = classification.retryable ? 'retryable_error' : 'fatal_error'
      fallbackChain.push({ model: model.model_id, status: attemptStatus, httpStatus: response.status })
      await recordAttempt(admin, user.id, model, attemptStatus, latencyMs, response.status, classification.code)

      if (classification.retryable) {
        await markModelFailure(admin, model, response.status, response.headers.get('retry-after'))
        continue
      }

      console.error('fatal provider error', model.provider, model.model_id, response.status, classification.code)
      fatalProviderConfig = classification.code === 'provider_auth'
      break
    } catch (error) {
      clearTimeout(timeout)
      const latencyMs = Date.now() - attemptStarted
      const timedOut = error instanceof DOMException && error.name === 'AbortError'
      const status: AttemptStatus = timedOut ? 'timeout' : 'retryable_error'
      fallbackChain.push({ model: model.model_id, status, httpStatus: null })
      await recordAttempt(admin, user.id, model, status, latencyMs, null, timedOut ? 'timeout' : 'network_error')
      await markModelFailure(admin, model, null, null)
      continue
    }
  }

  if (!answer || !modelUsed) {
    return json({
      error: fatalProviderConfig
        ? 'Averiq AI provider authentication needs attention.'
        : 'All available free AI models are temporarily unavailable. Try again shortly.',
    }, 503)
  }

  const totalLatencyMs = Date.now() - requestStarted
  await admin.from('ai_usage_events').insert({
    user_id: user.id,
    mode,
    input_chars: userMessage.length + selected.length + grounding.length,
    output_chars: answer.length,
    grounded,
    provider: modelUsed.provider,
    model_id: modelUsed.model_id,
    attempts: fallbackChain.length,
    latency_ms: totalLatencyMs,
    fallback_chain: fallbackChain,
  })

  let conversationId = payload.conversationId ?? null
  if (payload.persist) {
    if (!conversationId) {
      const { data: created } = await admin
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          title: clip(userMessage.replace(/\s+/g, ' '), 60),
          context: { subject: learning.subject ?? null, topic: learning.topic ?? null, examKey: learning.examKey ?? null },
        })
        .select('id')
        .single()
      conversationId = (created?.id as string | undefined) ?? null
    }
    if (conversationId) {
      await admin.from('ai_messages').insert([
        { conversation_id: conversationId, user_id: user.id, role: 'user', content: userMessage, mode },
        { conversation_id: conversationId, user_id: user.id, role: 'assistant', content: answer, mode },
      ])
      await admin.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId)
    }
  }

  return json({ content: answer, grounded, conversationId, mode })
})