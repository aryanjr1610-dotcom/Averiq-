import { Check, Copy, RotateCcw, ThumbsDown, ThumbsUp } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'

export type AIMessageProps = {
  children: ReactNode
  from?: 'user' | 'assistant'
  avatar?: ReactNode
  bubble?: boolean
  copyText?: string
  timestamp?: string
  onRetry?: () => void
  onVote?: (vote: 'up' | 'down') => void
  className?: string
}

export function AIMessage({
  children,
  from = 'assistant',
  avatar,
  bubble = true,
  copyText,
  timestamp,
  onRetry,
  onVote,
  className = '',
}: AIMessageProps) {
  const [copied, setCopied] = useState(false)
  const [vote, setVote] = useState<'up' | 'down' | null>(null)
  const user = from === 'user'

  useEffect(() => {
    if (!copied) return undefined
    const id = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(id)
  }, [copied])

  const copy = async () => {
    if (!copyText) return
    try {
      await navigator.clipboard.writeText(copyText)
      setCopied(true)
    } catch {
      // Clipboard denial is non-blocking; keep the conversation usable.
    }
  }

  const actions = [
    copyText ? {
      key: 'copy',
      label: copied ? 'Copied' : 'Copy',
      active: copied,
      icon: copied ? Check : Copy,
      onClick: copy,
    } : null,
    onRetry ? {
      key: 'retry',
      label: 'Regenerate answer',
      active: false,
      icon: RotateCcw,
      onClick: onRetry,
    } : null,
    onVote && !user ? {
      key: 'up',
      label: 'Good response',
      active: vote === 'up',
      icon: ThumbsUp,
      onClick: () => { setVote('up'); onVote('up') },
    } : null,
    onVote && !user ? {
      key: 'down',
      label: 'Bad response',
      active: vote === 'down',
      icon: ThumbsDown,
      onClick: () => { setVote('down'); onVote('down') },
    } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null)

  return (
    <article className={`ai-message-root ai-message-root--${from} ${className}`.trim()}>
      {avatar ? <div className="ai-message-root__avatar">{avatar}</div> : null}
      <div className="ai-message-root__content">
        <div className={`ai-message-root__bubble${bubble ? ' ai-message-root__bubble--on' : ''}`}>
          {children}
        </div>
        <div className="ai-message-root__meta">
          {timestamp ? <time className="ai-message-root__time">{timestamp}</time> : null}
          {actions.map((action, index) => {
            const Icon = action.icon
            return (
              <button
                key={action.key}
                type="button"
                aria-label={action.label}
                aria-pressed={action.active}
                className={`ai-message-action${action.active ? ' ai-message-action--active' : ''}`}
                style={{ transitionDelay: `${index * 30}ms` }}
                onClick={action.onClick}
              >
                <Icon size={14} aria-hidden="true" className={action.key === 'copy' && copied ? 'ai-message-pop' : undefined} />
              </button>
            )
          })}
        </div>
      </div>
    </article>
  )
}

export default AIMessage
