import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AI_MODES, type AIMode, type LearningContext } from './tutor'
import { useAITutor } from './AITutorProvider'
import { OfflineAiNotice } from '../offline/OfflineIndicator'
import { useOnlineStatus } from '../offline/useOffline'
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

export function AITutorPanel() {
  const tutor = useAITutor()
  const [draft, setDraft] = useState('')
  const [mode, setMode] = useState<AIMode>('explain')
  const endRef = useRef<HTMLDivElement | null>(null)
  const online = useOnlineStatus()
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [tutor.messages.length, tutor.busy])

  if (!tutor.open) return null

  const submit = () => {
    if (!online || tutor.busy || draft.trim().length === 0) return
    const text = draft
    setDraft('')
    void tutor.send(mode, text)
  }

  return (
    <DialogPrimitive.Root open={tutor.open} onOpenChange={(open) => { if (!open) tutor.closeTutor() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ai-backdrop" />
        <DialogPrimitive.Content className="ai-panel" aria-describedby={undefined} onOpenAutoFocus={(event) => { event.preventDefault(); if (document.activeElement instanceof HTMLElement) returnFocus.current = document.activeElement; const input = document.getElementById('ai-input') as HTMLTextAreaElement | null; if (input && !input.disabled) input.focus(); else document.getElementById('ai-close')?.focus() }} onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus.current?.focus() }}>
      <header className="ai-panel__head">
        <div>
          <DialogPrimitive.Title asChild><h2 className="ai-title">Averiq AI</h2></DialogPrimitive.Title>
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
        </div>
        <div className="ai-panel__actions">
          <button type="button" onClick={tutor.newChat}>New chat</button>
          <button type="button" id="ai-close" aria-label="Close Averiq AI" onClick={tutor.closeTutor}>Close</button>
        </div>
      </header>

      <div className="ai-thread" role="log" aria-label="Conversation" aria-live="polite" aria-busy={tutor.busy}>
        {!tutor.available ? (
          <p className="ai-note">Averiq AI is paused during exam-mode tests. Submit the test to continue.</p>
        ) : tutor.messages.length === 0 ? (
          <p className="ai-note">Ask about what you are reading. I use your class, board, subject and exam goal automatically.</p>
        ) : (
          tutor.messages.map((message) => (
            <article key={message.id} className={`ai-message ai-message--${message.role}`}>
              <Suspense fallback={<p className="ai-note">Preparing message?</p>}><MessageBody content={message.content} /></Suspense>
            </article>
          ))
        )}
        {tutor.busy ? <p className="ai-note">Thinking…</p> : null}
        {tutor.error ? (
          <p className="ai-error" role="alert">
            {tutor.error}{' '}
            <button type="button" onClick={() => void tutor.retry()}>Retry</button>
          </p>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="ai-modes">
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
          placeholder={online ? "Ask a question…" : "Offline"}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              submit()
            }
          }}
        />
        {tutor.busy ? (
          <button type="button" onClick={tutor.cancel}>Stop</button>
        ) : (
          <button type="submit" aria-label="Send message" disabled={!tutor.available || !online || draft.trim().length === 0}>Send</button>
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
      Ask Averiq AI
    </button>
  )
}
