import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useProfile } from '@/features/profile/ProfileProvider'
import {
  AITutorError,
  isTutorAllowed,
  requestTutor,
  type AIMessage,
  type AIMode,
  type LearningContext,
  type StudentContext,
} from './tutor'

type SendOptions = { selectedContent?: string; context?: LearningContext; persist?: boolean }

type AITutorValue = {
  open: boolean
  busy: boolean
  error: string | null
  messages: AIMessage[]
  learningContext: LearningContext
  examMode: boolean
  available: boolean
  openTutor: (mode?: AIMode, seed?: string, options?: SendOptions) => void
  closeTutor: () => void
  setLearningContext: (context: LearningContext) => void
  clearContextField: (field: keyof LearningContext) => void
  setExamMode: (examMode: boolean) => void
  send: (mode: AIMode, message: string, options?: SendOptions) => Promise<void>
  retry: () => Promise<void>
  cancel: () => void
  newChat: () => void
}

const AITutorContext = createContext<AITutorValue | null>(null)

function readStudentContext(profile: unknown): StudentContext {
  if (!profile || typeof profile !== 'object') return {}
  const row = profile as Record<string, unknown>
  const num = (keys: string[]): number | undefined => {
    for (const key of keys) {
      const value = row[key]
      if (typeof value === 'number' && Number.isFinite(value)) return value
      if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
    }
    return undefined
  }
  const str = (keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = row[key]
      if (typeof value === 'string' && value.length > 0) return value
    }
    return undefined
  }
  const list = (keys: string[]): string[] | undefined => {
    for (const key of keys) {
      const value = row[key]
      if (Array.isArray(value)) {
        const items = value.filter((item): item is string => typeof item === 'string')
        if (items.length > 0) return items
      }
    }
    return undefined
  }
  return {
    classLevel: num(['classLevel', 'class_level', 'grade']),
    board: str(['board', 'boardKey', 'board_key']),
    stream: str(['stream', 'streamKey', 'stream_key']),
    goals: list(['competitiveGoals', 'competitive_goals', 'goals']),
    preference: str(['learningPreference', 'learning_preference', 'preference']),
  }
}

let counter = 0
const nextId = () => {
  counter += 1
  return `m-${Date.now()}-${counter}`
}

export function AITutorProvider({ children }: { children: ReactNode }) {
  const profileState = useProfile() as unknown as { profile?: unknown }
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [learningContext, setContextState] = useState<LearningContext>({})
  const [examMode, setExamMode] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const controller = useRef<AbortController | null>(null)
  const lastRequest = useRef<{ mode: AIMode; message: string; options?: SendOptions } | null>(null)
  const inFlight = useRef(false)

  const studentContext = useMemo(() => readStudentContext(profileState.profile), [profileState.profile])

  const setLearningContext = useCallback((context: LearningContext) => {
    setContextState((previous) => {
      const merged = { ...previous, ...context }
      const same = Object.keys(merged).every(
        (key) => merged[key as keyof LearningContext] === previous[key as keyof LearningContext],
      )
      return same && Object.keys(merged).length === Object.keys(previous).length ? previous : merged
    })
  }, [])

  const clearContextField = useCallback((field: keyof LearningContext) => {
    setContextState((previous) => {
      const next = { ...previous }
      delete next[field]
      return next
    })
  }, [])

  const cancel = useCallback(() => {
    controller.current?.abort()
    controller.current = null
    inFlight.current = false
    setBusy(false)
  }, [])

  const send = useCallback(
    async (mode: AIMode, message: string, options?: SendOptions) => {
      if (!isTutorAllowed({ examMode })) {
        setError('Averiq AI is paused during an exam-mode test.')
        return
      }
      const text = message.trim()
      if (text.length === 0 || inFlight.current) return
      inFlight.current = true
      lastRequest.current = { mode, message: text, options }
      setError(null)
      setBusy(true)
      const context = { ...learningContext, ...(options?.context ?? {}) }
      const history = messages
        .filter((item) => !item.failed)
        .map((item) => ({ role: item.role, content: item.content }))

      setMessages((previous) => [
        ...previous,
        { id: nextId(), role: 'user', content: text, createdAt: new Date().toISOString(), mode, context },
      ])

      const abort = new AbortController()
      controller.current = abort
      try {
        const reply = await requestTutor(
          {
            mode,
            userMessage: text,
            conversationId,
            persist: options?.persist ?? true,
            studentContext,
            learningContext: context,
            selectedContent: options?.selectedContent,
            history,
          },
          abort.signal,
        )
        setConversationId(reply.conversationId)
        setMessages((previous) => [
          ...previous,
          {
            id: nextId(),
            role: 'assistant',
            content: reply.content,
            createdAt: new Date().toISOString(),
            mode: reply.mode,
            context,
          },
        ])
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === 'AbortError') {
          setMessages((previous) => previous.slice(0, -1))
        } else {
          setError(caught instanceof AITutorError ? caught.message : 'Averiq AI is temporarily unavailable. Try again.')
        }
      } finally {
        controller.current = null
        inFlight.current = false
        setBusy(false)
      }
    },
    [conversationId, examMode, learningContext, messages, studentContext],
  )

  const retry = useCallback(async () => {
    const request = lastRequest.current
    if (!request || busy) return
    // Drop the previous user turn so retry never duplicates messages.
    setMessages((previous) => {
      const index = [...previous].reverse().findIndex((item) => item.role === 'user')
      if (index === -1) return previous
      const cut = previous.length - 1 - index
      return previous.slice(0, cut)
    })
    setError(null)
    await send(request.mode, request.message, request.options)
  }, [busy, send])

  const openTutor = useCallback(
    (mode?: AIMode, seed?: string, options?: SendOptions) => {
      setOpen(true)
      if (options?.context) setLearningContext(options.context)
      if (mode && seed) void send(mode, seed, options)
    },
    [send, setLearningContext],
  )

  const newChat = useCallback(() => {
    cancel()
    setMessages([])
    setConversationId(null)
    setError(null)
    lastRequest.current = null
  }, [cancel])

  const value = useMemo<AITutorValue>(
    () => ({
      open,
      busy,
      error,
      messages,
      learningContext,
      examMode,
      available: isTutorAllowed({ examMode }),
      openTutor,
      closeTutor: () => setOpen(false),
      setLearningContext,
      clearContextField,
      setExamMode,
      send,
      retry,
      cancel,
      newChat,
    }),
    [open, busy, error, messages, learningContext, examMode, openTutor, setLearningContext, clearContextField, send, retry, cancel, newChat],
  )

  return <AITutorContext.Provider value={value}>{children}</AITutorContext.Provider>
}

export function useAITutor(): AITutorValue {
  const value = useContext(AITutorContext)
  if (!value) throw new Error('useAITutor must be used inside AITutorProvider')
  return value
}
