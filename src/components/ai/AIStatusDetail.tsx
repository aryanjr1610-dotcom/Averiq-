import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { type ReactNode, useState } from 'react'

export type AIStatusDetailProps = {
  summary: string
  children?: ReactNode
  active?: boolean
  defaultOpen?: boolean
  className?: string
}

/**
 * Collapsible, user-facing status detail. This is intentionally not a chain-of-
 * thought viewer: only concise product status or source/context summaries belong
 * here.
 */
export function AIStatusDetail({
  summary,
  children,
  active = false,
  defaultOpen = false,
  className = '',
}: AIStatusDetailProps) {
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`ai-status-detail ${className}`.trim()}>
      <button
        type="button"
        className="ai-status-detail__trigger"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <motion.span
          className="ai-status-detail__chevron"
          animate={{ rotate: open ? 90 : 0 }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', duration: 0.25, bounce: 0.1 }}
        >
          <ChevronRight size={14} aria-hidden="true" />
        </motion.span>
        <span className={active && !reduceMotion ? 'ai-status-detail__summary ai-status-detail__summary--active' : 'ai-status-detail__summary'}>
          {summary}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && children ? (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="ai-status-detail__body-wrap"
          >
            <div className="ai-status-detail__body">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default AIStatusDetail
