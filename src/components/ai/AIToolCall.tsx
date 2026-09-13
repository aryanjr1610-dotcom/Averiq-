import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { type ReactNode, useState } from 'react'

export type AIToolCallStatus = 'pending' | 'running' | 'success' | 'error'

export type AIToolCallProps = {
  name: string
  status?: AIToolCallStatus
  summary?: string
  args?: ReactNode
  result?: ReactNode
  defaultOpen?: boolean
  className?: string
}

const STATUS_LABEL: Record<AIToolCallStatus, string> = {
  pending: 'Queued',
  running: 'Running',
  success: 'Done',
  error: 'Failed',
}

function ToolBadge({ status }: { status: AIToolCallStatus }) {
  const reduceMotion = Boolean(useReducedMotion())
  const running = status === 'running'
  return (
    <span className="ai-tool-call__badge" data-status={status} aria-hidden="true">
      <motion.span
        className="ai-tool-call__ring"
        animate={running && !reduceMotion ? { rotate: 360 } : { rotate: 0 }}
        transition={running && !reduceMotion ? { duration: 0.9, ease: 'linear', repeat: Number.POSITIVE_INFINITY } : { duration: 0 }}
      />
      {status === 'success' ? <span className="ai-tool-call__mark">✓</span> : null}
      {status === 'error' ? <span className="ai-tool-call__mark">×</span> : null}
    </span>
  )
}

/**
 * Presentational tool lifecycle card. Averiq only renders this when the AI
 * backend provides real tool metadata; it should never be used to invent calls.
 */
export function AIToolCall({
  name,
  status = 'pending',
  summary,
  args,
  result,
  defaultOpen = false,
  className = '',
}: AIToolCallProps) {
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState(defaultOpen)
  const hasDetail = Boolean(args || result)

  return (
    <div className={`ai-tool-call ${className}`.trim()}>
      <button
        type="button"
        className="ai-tool-call__trigger"
        aria-expanded={hasDetail ? open : undefined}
        disabled={!hasDetail}
        onClick={() => setOpen((value) => !value)}
      >
        <ToolBadge status={status} />
        <span className="ai-tool-call__name">{name}</span>
        {summary ? <span className="ai-tool-call__summary">{summary}</span> : null}
        <span className="sr-only">{STATUS_LABEL[status]}</span>
        {hasDetail ? (
          <motion.span
            className="ai-tool-call__chevron"
            animate={{ rotate: open ? 90 : 0 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', duration: 0.25, bounce: 0.1 }}
          >
            <ChevronRight size={14} aria-hidden="true" />
          </motion.span>
        ) : null}
      </button>

      <AnimatePresence initial={false}>
        {open && hasDetail ? (
          <motion.div
            className="ai-tool-call__detail-wrap"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="ai-tool-call__detail">
              {args ? <div><span>Arguments</span>{args}</div> : null}
              {result ? <div><span>Result</span>{result}</div> : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default AIToolCall
