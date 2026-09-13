import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AI_MODES, type AIMode, type LearningContext } from './tutor'
import { useAITutor } from './AITutorProvider'
import { OfflineAiNotice } from '../offline/OfflineIndicator'
import { useOnlineStatus } from '../offline/useOffline'
import { AIConversation } from '@/components/ai/AIConversation'
import { AILoader } from '@/components/ai/AILoader'
import { AIMessage } from '@/components/ai/AIMessage'
import { AIOrb } from '@/components/ai/AIOrb'
import { AIStatusDetail } from '@/components/ai/AIStatusDetail'
import type { AIState } from '@/components/ai/aiState'
import { Button } from '@/components/ui/Button'
import './ai.css'

const QUICK_MODES: AIMode[] = ['explain', 'simplify', 'hint', 'solve-steps', 'quick-revision', 'make-notes']

const MessageBody = lazy(() => import('./TutorMessage'))

const CONTEXT_CHIPS: Array<{ field: keyof LearningContext; removable: boolean; label: (value: string) => string }> = [
  { field: 'subject', removable: true, label: (value) => value },
  { field: 'chapter', removable: true, label: (value) => value },
  { field: 'topic', removable: true, label: (value) => value },
  { field: 'formulaKey', removable: true, label: (value) => value },
  { field: 'examKey', removable: false, label: (value) => value.toUpperCase() },
]

function formatMessageTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date)
}

export function AITutorPanel() {
  const tutor = useAITutor()
  const [draft, setDraft] = useState('')
  const [mode, setMode] = useState<AIMode>('explain')
  const online = useOnlineStatus()
  const returnFocus = useRef<HTMLElement | null>(null)

  const aiState: AIState = tutor.error
    ? 'error'
    : tutor.busy
      ? 'thinking'
      : draft.trim().length > 0
        ? 'listening'
        : 'idle'

  const lastAssistantIndex = useMemo(() => {
    for (let index = tutor.messages.length - 1; index >= 0; index -= 1) {
      if (tutor.messages[index]?.role === 'assistant') return index
    }
    return -1
  }, [tutor.messages])

  if (!tutor.open) return null

  const submit = () => {
    if (!online || tutor.busy || draft.trim().length === 0) return
    const text = draft
    setDraft('')
    void tutor.send(mode, text)
  }

  const contentKey = `${tutor.messages.length}:${tutor.busy ? 1 : 0}:${tutor.error ?? ''}`

  return (
    <DialogPrimitive.Root open={tutor.open} onOpenChange={(open) => { if (!open) tutor.closeTutor() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ai-backdrop" />
        <DialogPrimitive.Content
          className="ai-panel"
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            if (document.activeElement instanceof HTMLElement) returnFocus.current = document.activeElement
            const input = document.getElementById('ai-input') as HTMLTextAreaElement | null
            if (input && !input.disabled) input.focus()
            else document.getElementById('ai-close')?.focus()
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            returnFocus.current?.focus()
          }}
        >
          <header className="ai-panel__head">
            <div className="ai-panel__identity">
              <AIOrb state={aiState} size={38} />
              <div className="ai-panel__identity-copy">
                <DialogPrimitive.Title asChild><h2 className="ai-title">Averiq AI</h2></DialogPrimitive.Title>
                <p className="ai-panel__state">{tutor.busy ? 'Working with your study context' : 'Your contextual study tutor'}</p>
              </div>
            </div>

            <div className="ai-panel__actions">
              <Button type="button" size="sm" variant="ghost" onClick={tutor.newChat}>New chat</Button>
              <Button type="button" size="sm" variant="ghost" id="ai-close" aria-label="Close Averiq AI" onClick={tutor.closeTutor}>Close</Button>
            </div>

            <div className="ai-chips">
              {CONTEXT_CHIPS.map((chip) => {
                const raw = tutor.learningContext[chip.field]
                if (typeof raw !== 'string' || raw.length === 0) return null
                return (
                  <span key={chip.field} className="ai-chip">
                    {chip.label(raw)}
                    {chip.removable ? (
                      <button type="button" aria-label={`Remove ${chip.label(raw)} context`} onClick={() => tutor.clearContextField(chip.field)}>
                        ×
                      </button>
                    ) : null}
                  </span>
                )
              })}
            </div>
          </header>

          <AIConversation className="ai-thread-shell" contentKey={contentKey} ariaLabel="Averiq AI conversation">
            <div className="ai-thread" aria-busy={tutor.busy}>
              {!tutor.available ? (
                <p className="ai-note">Averiq AI is paused during exam-mode tests. Submit the test to continue.</p>
              ) : tutor.messages.length === 0 ? (
                <div className="ai-empty-state">
                  <AIOrb state="idle" size={58} />
                  <div>
                    <h3>Ask from where you are</h3>
                    <p className="ai-note">I use your class, board, subject, chapter and exam goal automatically when they are available.</p>
                  </div>
                </div>
              ) : (
                tutor.messages.map((message, index) => (
                  <AIMessage
                    key={message.id}
                    from={message.role}
                    bubble={message.role === 'user'}
                    avatar={message.role === 'assistant' ? <AIOrb state="idle" size={24} /> : undefined}
                    copyText={message.content}
                    timestamp={formatMessageTime(message.createdAt)}
                    onRetry={message.role === 'assistant' && index === lastAssistantIndex && !tutor.busy ? () => void tutor.retry() : undefined}
                  >
                    <Suspense fallback={<AILoader variant="dots" label="Preparing message" />}>
                      <MessageBody content={message.content} animate={message.role === 'assistant'} />
                    </Suspense>
                  </AIMessage>
                ))
              )}

              {tutor.busy ? (
                <div className="ai-work-state">
                  <AIOrb state="thinking" size={28} />
                  <div className="ai-work-state__copy">
                    <AILoader variant="dots" label="Thinking" showElapsed />
                    <AIStatusDetail summary="Preparing your answer" active>
                      <p>Using your current learning context and the selected {AI_MODES.find((item) => item.mode === mode)?.label.toLowerCase() ?? 'study'} mode.</p>
                    </AIStatusDetail>
                  </div>
                </div>
              ) : null}

              {tutor.error ? (
                <div className="ai-error" role="alert">
                  <AIOrb state="error" size={24} />
                  <span>{tutor.error}</span>
                  <Button type="button" size="sm" variant="outline" onClick={() => void tutor.retry()}>Retry</Button>
                </div>
              ) : null}
            </div>
          </AIConversation>

          <div className="ai-modes" aria-label="AI response mode">
            {AI_MODES.filter((item) => QUICK_MODES.includes(item.mode)).map((item) => (
              <button
                key={item.mode}
                type="button"
                aria-pressed={mode === item.mode}
                className={mode === item.mode ? 'ai-mode ai-mode--on' : 'ai-mode'}
                onClick={() => setMode(item.mode)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <OfflineAiNotice />

          <form
            className="ai-composer"
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <label className="ai-visually-hidden" htmlFor="ai-input">Ask Averiq AI</label>
            <textarea
              id="ai-input"
              rows={2}
              value={draft}
              disabled={!tutor.available || !online}
              placeholder={online ? 'Ask a question…' : 'Offline'}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  submit()
                }
              }}
            />
            {tutor.busy ? (
              <Button type="button" variant="secondary" onClick={tutor.cancel}>Stop</Button>
            ) : (
              <Button type="submit" variant="primary" aria-label="Send message" disabled={!tutor.available || !online || draft.trim().length === 0}>Send</Button>
            )}
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function AITutorLauncher() {
  const tutor = useAITutor()
  if (tutor.open || !tutor.available) return null
  return (
    <button type="button" className="ai-launcher" onClick={() => tutor.openTutor()}>
      <AIOrb state="idle" size={24} />
      <span>Ask Averiq AI</span>
    </button>
  )
}
