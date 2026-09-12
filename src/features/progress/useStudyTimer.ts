import { useEffect, useRef } from 'react'
import { progressRepository } from './repository'

const IDLE_MS = 60_000
const FLUSH_MS = 30_000

/**
 * Counts a second only when the tab is visible AND the student interacted
 * within the last minute, so a page left open overnight adds nothing.
 */
export function useStudyTimer(options: {
  activityType: 'lesson' | 'practice' | 'revision' | 'flashcards' | 'visual'
  lessonId?: string
  chapterId?: string
  subjectId?: string
  enabled?: boolean
  onFlush?: (seconds: number) => void
}) {
  const active = useRef(0)
  const pending = useRef(0)
  const lastInput = useRef(Date.now())
  const startedAt = useRef(new Date().toISOString())
  const opts = useRef(options)
  opts.current = options

  useEffect(() => {
    if (options.enabled === false) return
    const mark = () => { lastInput.current = Date.now() }
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart']
    for (const event of events) window.addEventListener(event, mark, { passive: true })

    const tick = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastInput.current > IDLE_MS) return
      active.current += 1
      pending.current += 1
    }, 1000)

    const flush = () => {
      const seconds = pending.current
      if (seconds < 20) return
      pending.current = 0
      const current = opts.current
      void progressRepository
        .recordSession({
          activityType: current.activityType,
          activeSeconds: seconds,
          lessonId: current.lessonId,
          chapterId: current.chapterId,
          subjectId: current.subjectId,
          startedAt: startedAt.current,
        })
        .catch(() => undefined)
      if (current.lessonId) {
        void progressRepository.saveLesson({ lessonId: current.lessonId, addStudySeconds: seconds }).catch(() => undefined)
      }
      startedAt.current = new Date().toISOString()
      current.onFlush?.(seconds)
    }

    const flushTimer = window.setInterval(flush, FLUSH_MS)
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', onHide)

    return () => {
      for (const event of events) window.removeEventListener(event, mark)
      window.clearInterval(tick)
      window.clearInterval(flushTimer)
      document.removeEventListener('visibilitychange', onHide)
      flush()
    }
  }, [options.enabled])

  return { activeSeconds: () => active.current }
}
