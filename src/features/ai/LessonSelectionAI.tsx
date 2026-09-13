import { useEffect, useState } from 'react'
import { AIOrb } from '@/components/ai/AIOrb'
import { Button } from '@/components/ui/Button'
import { useAITutor } from './AITutorProvider'
import type { AIMode } from './tutor'
import './ai.css'
import './smooth-ai.css'

type Anchor = { x: number; y: number; text: string; lessonId?: string; blockId?: string }

const ACTIONS: Array<{ mode: AIMode; label: string; prompt: string }> = [
  { mode: 'explain', label: 'Explain', prompt: 'Explain the selected passage.' },
  { mode: 'simplify', label: 'Simplify', prompt: 'Re-explain the selected passage more simply.' },
  { mode: 'explain', label: 'Example', prompt: 'Give one worked example for the selected passage.' },
]

export function LessonSelectionAI() {
  const tutor = useAITutor()
  const [anchor, setAnchor] = useState<Anchor | null>(null)

  useEffect(() => {
    const onSelection = () => {
      const selection = window.getSelection()
      const text = selection?.toString().trim() ?? ''
      if (!selection || selection.rangeCount === 0 || text.length < 12) {
        setAnchor(null)
        return
      }
      const range = selection.getRangeAt(0)
      const node = range.commonAncestorContainer
      const element = node instanceof Element ? node : node.parentElement
      const block = element?.closest('[data-block-id]') ?? null
      const lesson = element?.closest('[data-lesson-id]') ?? null
      if (!lesson) {
        setAnchor(null)
        return
      }
      const rect = range.getBoundingClientRect()
      setAnchor({
        x: rect.left + rect.width / 2,
        y: rect.top,
        text: text.slice(0, 4000),
        lessonId: lesson.getAttribute('data-lesson-id') ?? undefined,
        blockId: block?.getAttribute('data-block-id') ?? undefined,
      })
    }
    const onScroll = () => setAnchor(null)
    document.addEventListener('selectionchange', onSelection)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.removeEventListener('selectionchange', onSelection)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  if (!anchor || !tutor.available) return null

  return (
    <div className="ai-selection" style={{ left: `${anchor.x}px`, top: `${Math.max(anchor.y - 46, 8)}px` }} role="toolbar" aria-label="AI actions for selected text">
      <AIOrb state="idle" size={20} />
      {ACTIONS.map((action) => (
        <Button
          key={action.label}
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            tutor.openTutor(action.mode, action.prompt, {
              selectedContent: anchor.text,
              context: { lessonId: anchor.lessonId, blockId: anchor.blockId },
            })
            setAnchor(null)
          }}
        >
          {action.label}
        </Button>
      ))}
      <Button
        type="button"
        size="sm"
        variant="primary"
        onClick={() => {
          tutor.setLearningContext({ lessonId: anchor.lessonId, blockId: anchor.blockId })
          tutor.openTutor()
          setAnchor(null)
        }}
      >
        Ask AI
      </Button>
    </div>
  )
}
