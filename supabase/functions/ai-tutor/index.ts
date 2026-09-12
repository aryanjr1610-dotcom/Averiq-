// Deno Edge Function. Secrets never leave this file's environment.
// Deploy: npx supabase functions deploy ai-tutor
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

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const apiKey = Deno.env.get('AI_API_KEY')
  const model = Deno.env.get('AI_MODEL') ?? 'gpt-4o-mini'
  const baseUrl = Deno.env.get('AI_BASE_URL') ?? 'https://api.openai.com/v1'
  if (!supabaseUrl || !serviceKey || !apiKey) return json({ error: 'Averiq AI is not configured.' }, 503)

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

  // Rate limiting (server-side, not UI-only).
  const minuteAgo = new Date(Date.now() - 60_000).toISOString()
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString()
  const [{ count: recent }, { count: daily }] = await Promise.all([
    admin.from('ai_usage_events').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', minuteAgo),
    admin.from('ai_usage_events').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', dayAgo),
  ])
  if ((recent ?? 0) >= 6) return json({ error: 'Too many requests. Wait a few seconds.' }, 429)
  if ((daily ?? 0) >= 200) return json({ error: 'Daily AI limit reached.' }, 429)

  // Content grounding: only published lesson versions from the curriculum engine.
  const learning = payload.learningContext ?? {}
  let grounding = ''
  let grounded = false
  if (learning.lessonId) {
    const { data: versions } = await admin
      .from('lesson_versions')
      .select('document, status')
      .eq('lesson_id', learning.lessonId)
      .eq('status', 'published')
      .limit(1)
    const document = versions?.[0]?.document as { blocks?: Array<Record<string, unknown>> } | undefined
    const blocks = Array.isArray(document?.blocks) ? document?.blocks ?? [] : []
    const target = learning.blockId ? blocks.filter((block) => block['id'] === learning.blockId) : blocks.slice(0, 12)
    const parts: string[] = []
    collectText(target.length > 0 ? target : blocks.slice(0, 8), parts)
    grounding = clip(parts.join('\n'), MAX_GROUNDING)
    grounded = grounding.length > 0
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

  let answer = ''
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 1200,
        messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: userMessage }],
      }),
    })
    if (!response.ok) {
      console.error('provider error', response.status, await response.text())
      return json({ error: 'Averiq AI is temporarily unavailable. Try again.' }, 502)
    }
    const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
    answer = body.choices?.[0]?.message?.content?.trim() ?? ''
  } catch (error) {
    console.error('provider exception', error)
    return json({ error: 'Averiq AI is temporarily unavailable. Try again.' }, 502)
  }
  if (!answer) return json({ error: 'Averiq AI returned an empty response. Try again.' }, 502)

  await admin.from('ai_usage_events').insert({
    user_id: user.id,
    mode,
    input_chars: userMessage.length + selected.length + grounding.length,
    output_chars: answer.length,
    grounded,
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
