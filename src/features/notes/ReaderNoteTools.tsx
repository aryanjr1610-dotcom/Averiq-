import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { notesRepository } from './repository'
import { captureSelection, paintHighlights } from './highlighting'
import type { Highlight, HighlightColor } from './model'

/**
 * Mount inside the lesson reader. Watches selections within
 * [data-lesson-id] / [data-block-id] and offers Highlight + Add note.
 */
export const ReaderNoteTools = ({
	lessonId,
	contentVersionId,
	rootRef,
}: {
	lessonId: string
	contentVersionId?: string | null
	rootRef: React.RefObject<HTMLElement | null>
}) => {
	const { user } = useAuth()
	const userId = user?.id ?? null
	const navigate = useNavigate()
	const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
	const [note, setNote] = useState<string | null>(null)
	const [unanchored, setUnanchored] = useState(0)
	const captured = useRef<ReturnType<typeof captureSelection>>(null)

	// Paint existing highlights once the content is on screen.
	useEffect(() => {
		if (!userId || !rootRef.current) return
		let active = true
		notesRepository
			.listHighlights(userId, lessonId)
			.then((items: Highlight[]) => {
				if (!active || !rootRef.current) return
				const result = paintHighlights(rootRef.current, items)
				setUnanchored(result.unanchored.length)
			})
			.catch(() => undefined)
		return () => {
			active = false
		}
	}, [userId, lessonId, rootRef])

	useEffect(() => {
		const onSelect = () => {
			const capture = captureSelection()
			captured.current = capture
			if (!capture) {
				setPosition(null)
				return
			}
			const selection = window.getSelection()
			const rect = selection?.rangeCount ? selection.getRangeAt(0).getBoundingClientRect() : null
			if (!rect) {
				setPosition(null)
				return
			}
			setPosition({ top: Math.max(8, rect.top - 48), left: Math.max(8, rect.left) })
		}
		document.addEventListener('selectionchange', onSelect)
		return () => document.removeEventListener('selectionchange', onSelect)
	}, [])

	const highlight = useCallback(
		async (color: HighlightColor) => {
			const capture = captured.current
			if (!capture || !userId) return
			setPosition(null)
			try {
				const saved = await notesRepository.createHighlight(userId, {
					lessonId: capture.lessonId || lessonId,
					blockId: capture.blockId,
					contentVersionId: contentVersionId ?? null,
					selectedText: capture.selectedText,
					textSnapshot: capture.textSnapshot,
					prefix: capture.prefix,
					suffix: capture.suffix,
					color,
				})
				if (rootRef.current) paintHighlights(rootRef.current, [saved])
				window.getSelection()?.removeAllRanges()
				setNote('Highlight saved to Saved learning.')
			} catch (error) {
				setNote(error instanceof Error ? error.message : 'Could not save the highlight.')
			}
		},
		[userId, lessonId, contentVersionId, rootRef],
	)

	const addNote = useCallback(async () => {
		const capture = captured.current
		if (!userId) return
		setPosition(null)
		try {
			const created = await notesRepository.createNote(userId, {
				type: 'lesson',
				lessonId: capture?.lessonId || lessonId,
				blockId: capture?.blockId ?? null,
				content: capture ? `> ${capture.selectedText}\n\n` : '',
			})
			navigate(`/app/notes?note=${created.id}`)
		} catch (error) {
			setNote(error instanceof Error ? error.message : 'Could not create the note.')
		}
	}, [userId, lessonId, navigate])

	if (!userId) return null

	return (
		<>
			{position ? (
				<div className="reader-tools" style={{ top: position.top, left: position.left }} role="toolbar" aria-label="Selection actions">
					<button type="button" onClick={() => void highlight('default')}>
						Highlight
					</button>
					<button type="button" onClick={() => void highlight('important')}>
						Important
					</button>
					<button type="button" onClick={() => void highlight('question')}>
						Doubt
					</button>
					<button type="button" onClick={() => void addNote()}>
						Add note
					</button>
				</div>
			) : null}
			{unanchored > 0 ? (
				<p className="note-note note-note--warn">
					{unanchored} highlight{unanchored === 1 ? '' : 's'} could not be placed because this lesson was updated. The saved text is still in
					Saved learning.
				</p>
			) : null}
			{note ? (
				<p className="note-note" role="status">
					{note}
				</p>
			) : null}
		</>
	)
}

export default ReaderNoteTools
