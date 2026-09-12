import { useEffect, useRef, useState } from 'react'
import { notesRepository } from './repository'
import { noteHeading, type Note } from './model'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/** Lightweight editor: plain textarea + debounced auto-save, no new dependency. */
export const NoteEditor = ({
	note,
	onSaved,
	onDelete,
	tagOptions,
}: {
	note: Note
	onSaved: (note: Note) => void
	onDelete: (note: Note) => void
	tagOptions: string[]
}) => {
	const [title, setTitle] = useState(note.title ?? '')
	const [content, setContent] = useState(note.content)
	const [tags, setTags] = useState(note.tags.join(', '))
	const [state, setState] = useState<SaveState>('idle')
	const timer = useRef<number | null>(null)
	const dirty = useRef(false)

	useEffect(() => {
		setTitle(note.title ?? '')
		setContent(note.content)
		setTags(note.tags.join(', '))
		setState('idle')
		dirty.current = false
	}, [note.id, note.title, note.content, note.tags])

	useEffect(() => {
		if (!dirty.current) return undefined
		if (timer.current) window.clearTimeout(timer.current)
		timer.current = window.setTimeout(() => {
			setState('saving')
			notesRepository
				.saveNote(note.id, { title: title.trim() ? title.trim() : null, content })
				.then(() => {
					setState('saved')
					dirty.current = false
					onSaved({ ...note, title: title.trim() ? title.trim() : null, content, updatedAt: new Date().toISOString() })
				})
				.catch(() => setState('error'))
		}, 900)
		return () => {
			if (timer.current) window.clearTimeout(timer.current)
		}
	}, [title, content, note, onSaved])

	// Best-effort flush when leaving the editor.
	useEffect(
		() => () => {
			if (dirty.current) void notesRepository.saveNote(note.id, { content, title: title.trim() || null }).catch(() => undefined)
		},
		[note.id, content, title],
	)

	const saveTags = async () => {
		try {
			const next = await notesRepository.setTags(note.id.length > 0 ? note.id : '', note.id, tags.split(','))
			onSaved({ ...note, tags: next })
		} catch {
			setState('error')
		}
	}

	return (
		<div className="note-editor">
			<div className="note-editor__bar">
				<input
					className="note-editor__title"
					value={title}
					placeholder={noteHeading(note)}
					maxLength={200}
					onChange={(event) => {
						dirty.current = true
						setTitle(event.target.value)
					}}
					aria-label="Note title"
				/>
				<span className="note-status" role="status">
					{state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : state === 'error' ? 'Not saved — retry typing' : ''}
				</span>
			</div>
			<textarea
				className="note-editor__body"
				value={content}
				rows={14}
				maxLength={20000}
				placeholder="Write your own explanation, doubt or exam trick…"
				onChange={(event) => {
					dirty.current = true
					setContent(event.target.value)
				}}
				aria-label="Note content"
			/>
			<div className="note-editor__foot">
				<label className="note-tags">
					<span className="note-label">Tags</span>
					<input
						value={tags}
						onChange={(event) => setTags(event.target.value)}
						onBlur={() => void saveTags()}
						placeholder="electrostatics, formulas"
						list="note-tag-options"
					/>
					<datalist id="note-tag-options">
						{tagOptions.map((tag) => (
							<option key={tag} value={tag} />
						))}
					</datalist>
				</label>
				<div className="note-editor__actions">
					<button
						type="button"
						className="note-ghost"
						onClick={() => {
							const pinned = !note.pinned
							void notesRepository.saveNote(note.id, { pinned }).then(() => onSaved({ ...note, pinned }))
						}}
					>
						{note.pinned ? 'Unpin' : 'Pin'}
					</button>
					<button type="button" className="note-ghost" onClick={() => onDelete(note)}>
						Delete
					</button>
				</div>
			</div>
		</div>
	)
}

export default NoteEditor
