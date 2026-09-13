import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

const BOTTOM_THRESHOLD_PX = 48

export type AIConversationProps = {
  children: ReactNode
  className?: string
  contentKey?: string | number
  ariaLabel?: string
}

/**
 * Conversation viewport that follows new content only while the reader is
 * already near the bottom. Scrolling up is treated as an explicit intent to
 * read older content, so the tutor never yanks the view back down.
 */
export function AIConversation({
  children,
  className = '',
  contentKey,
  ariaLabel = 'Conversation',
}: AIConversationProps) {
  const reduceMotion = useReducedMotion()
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [pinned, setPinned] = useState(true)

  const measure = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const distance = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
    setPinned(distance <= BOTTOM_THRESHOLD_PX)
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const viewport = viewportRef.current
    if (!viewport) return
    if (typeof viewport.scrollTo === 'function') {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior })
    } else {
      viewport.scrollTop = viewport.scrollHeight
    }
    setPinned(true)
  }, [])

  useLayoutEffect(() => {
    if (pinned) scrollToBottom(reduceMotion ? 'auto' : 'smooth')
  }, [contentKey, pinned, reduceMotion, scrollToBottom])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(() => {
      if (pinned) scrollToBottom('auto')
      else measure()
    })
    observer.observe(viewport)
    for (const child of Array.from(viewport.children)) observer.observe(child)
    return () => observer.disconnect()
  }, [contentKey, measure, pinned, scrollToBottom])

  return (
    <div className={`ai-conversation ${className}`.trim()}>
      <div
        ref={viewportRef}
        className="ai-conversation__viewport"
        role="log"
        aria-label={ariaLabel}
        aria-live="polite"
        onScroll={measure}
      >
        {children}
      </div>

      <AnimatePresence initial={false}>
        {!pinned ? (
          <motion.button
            type="button"
            className="ai-conversation__latest"
            aria-label="Jump to latest message"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', duration: 0.25, bounce: 0.1 }}
            onClick={() => scrollToBottom(reduceMotion ? 'auto' : 'smooth')}
          >
            <ArrowDown size={13} aria-hidden="true" />
            Jump to latest
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default AIConversation
