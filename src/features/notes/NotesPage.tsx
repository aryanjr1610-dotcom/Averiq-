import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { notesRepository } from './repository'
import { NoteEditor } from './NoteEditor'
import { bookmarkRoute, filterNotes, HIGHLIGHT_LABEL, noteHeading, sortNotes, type Bookmark, type Highlight, type Note } from './model'
import './notes.css'

type Tab = 'notes' | 'highlights' | 'bookmarks'

export const NotesPage = () => {
	const { user } = useAuth()
	const userId = user?.id ?? null
	const [tab, setTab] = useState<Tab>('notes')
	const [notes, setNotes] = useState<Note[]>([])
	const [highlights, setHighlights] = useState<Highlight[]>([])
	const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
	const [tagOptions, setTagOptions] = useState<string[]>([])
	const [activeId, setActiveId] = useState<string | null>(null)
	const [query, setQuery] = useState('')
	const [tag, setTag] = useState<string | null>(null)
	const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
	const [message, setMessage] = useState<string | null>(null)

	const load = useCallback(async () => {
		if (!userId) return
		setStatus('loading')
		try {
			const [n, h, b, t] = await Promise.all([
				notesRepository.listNotes(userId),
				notesRepository.listHighlights(userId),
				notesRepository.listBookmarks(userId),
				notesRepository.listTags(userId),
			])
			setNotes(sortNotes(n))
			setHighlights(h)
			setBookmarks(b)
			setTagOptions(t)
			setActiveId((current) => current ?? n[0]?.id ?? null)
			setStatus('ready')
			setMessage(null)
		} catch (error) {
			setStatus('error')
			setMessage(error instanceof Error ? error.message : 'Could not load your saved learning.')
		}
	}, [userId])

	useEffect(() => {
		void load()
	}, [load])

	const visible = useMemo(() => sortNotes(filterNotes(notes, query, tag)), [notes, query, tag])
	const active = useMemo(() => visible.find((note) => note.id === activeId) ?? visible[0] ?? null, [visible, activeId])

	const create = async () => {
		if (!userId) return
		try {
			const note = await notesRepository.createNote(userId, { type: 'personal', content: '' })
			setNotes((prev) => sortNotes([note, ...prev]))
			setActiveId(note.id)
			setTab('notes')
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not create the note.')
		}
	}

	if (!userId) return <p className="note-note">Sign in to see your notes, highlights and bookmarks.</p>

	return (
		<div className="notes">
			<header className="notes-head">
				<div>
					<h1>Saved learning</h1>
					<p className="note-note">Your notes, highlights and bookmarks in one place. Only you can see them.</p>
				</div>
				<div className="notes-head__actions">
					<Link className="note-ghost" to="/app/search">
						Search everything
					</Link>
					<button type="button" className="note-primary" onClick={() => void create()}>
						New note
					</button>
				</div>
			</header>

			<div className="notes-tabs" role="tablist" aria-label="Saved learning">
				{(['notes', 'highlights', 'bookmarks'] as Tab[]).map((item) => (
					<button
						key={item}
						type="button"
						role="tab"
						aria-selected={tab === item}
						className={`notes-tab${tab === item ? ' notes-tab--on' : ''}`}
						onClick={() => setTab(item)}
					>
						{item === 'notes' ? `Notes (${notes.length})` : item === 'highlights' ? `Highlights (${highlights.length})` : `Bookmarks (${bookmarks.length})`}
					</button>
				))}
			</div>

			{message ? (
				<p className="note-note note-note--warn" role="status">
					{message}{' '}
					<button type="button" className="note-ghost" onClick={() => void load()}>
						Retry
					</button>
				</p>
			) : null}

			{status === 'loading' ? <p className="note-note">Loading…</p> : null}

			{tab === 'notes' && status === 'ready' ? (
				<div className="notes-body">
					<aside className="notes-side">
						<label className="notes-filter">
							<span className="note-visually-hidden">Search notes</span>
							<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes" />
						</label>
						{tagOptions.length > 0 ? (
							<div className="notes-chips">
								<button type="button" className={`note-chip${tag === null ? ' note-chip--on' : ''}`} onClick={() => setTag(null)}>
									All
								</button>
								{tagOptions.map((item) => (
									<button
										key={item}
										type="button"
										className={`note-chip${tag === item ? ' note-chip--on' : ''}`}
										onClick={() => setTag(item === tag ? null : item)}
									>
										{item}
									</button>
								))}
							</div>
						) : null}
						{visible.length === 0 ? (
							<p className="note-note">No notes yet. Add one from a lesson or create a blank note.</p>
						) : (
							<ul className="notes-list">
								{visible.map((note) => (
									<li key={note.id}>
										<button
											type="button"
											className={`notes-item${active?.id === note.id ? ' notes-item--on' : ''}`}
											onClick={() => setActiveId(note.id)}
										>
											<span className="notes-item__title">
												{note.pinned ? '★ ' : ''}
												{noteHeading(note)}
											</span>
											<span className="notes-item__meta">
												{note.lessonId ? 'From a lesson' : 'Personal'} · {new Date(note.updatedAt).toLocaleDateString()}
											</span>
										</button>
									</li>
								))}
							</ul>
						)}
					</aside>
					<section className="notes-main">
						{active ? (
							<>
								{active.lessonId ? (
									<Link className="note-ghost" to={`/app/learn/lessons/${active.lessonId}${active.blockId ? `#${active.blockId}` : ''}`}>
										Back to the lesson
									</Link>
								) : null}
								<NoteEditor
									note={active}
									tagOptions={tagOptions}
									onSaved={(updated) => setNotes((prev) => sortNotes(prev.map((item) => (item.id === updated.id ? updated : item))))}
									onDelete={(note) => {
										setNotes((prev) => prev.filter((item) => item.id !== note.id))
										setActiveId(null)
										void notesRepository.deleteNote(note.id).catch(() => void load())
									}}
								/>
							</>
						) : (
							<p className="note-note">Select a note to edit it.</p>
						)}
					</section>
				</div>
			) : null}

			{tab === 'highlights' && status === 'ready' ? (
				<section className="notes-block">
					{highlights.length === 0 ? (
						<p className="note-note">Select text inside any lesson and choose Highlight to save it here.</p>
					) : (
						<ul className="notes-cards">
							{highlights.map((item) => (
								<li key={item.id} className={`notes-card notes-card--${item.color}`}>
									<p className="notes-card__text">“{item.selectedText}”</p>
									<p className="notes-card__meta">{HIGHLIGHT_LABEL[item.color]}</p>
									<div className="notes-card__actions">
										<Link className="note-ghost" to={`/app/learn/lessons/${item.lessonId}#${item.blockId}`}>
											Open in lesson
										</Link>
										<button
											type="button"
											className="note-ghost"
											onClick={() => {
												setHighlights((prev) => prev.filter((h) => h.id !== item.id))
												void notesRepository.deleteHighlight(item.id).catch(() => void load())
											}}
										>
											Remove
										</button>
									</div>
								</li>
							))}
						</ul>
					)}
				</section>
			) : null}

			{tab === 'bookmarks' && status === 'ready' ? (
				<section className="notes-block">
					{bookmarks.length === 0 ? (
						<p className="note-note">Bookmark a lesson, formula or question to find it instantly later.</p>
					) : (
						<ul className="notes-cards">
							{bookmarks.map((item) => (
								<li key={item.id} className="notes-card">
									<p className="notes-card__text">{item.title ?? item.entityId}</p>
									<p className="notes-card__meta">{item.entityType}</p>
									<div className="notes-card__actions">
										<Link className="note-ghost" to={bookmarkRoute(item)}>
											Open
										</Link>
										<button
											type="button"
											className="note-ghost"
											onClick={() => {
												setBookmarks((prev) => prev.filter((b) => b.id !== item.id))
												void notesRepository
													.removeBookmark(userId, item.entityType, item.entityId)
													.catch(() => void load())
											}}
										>
											Remove
										</button>
									</div>
								</li>
							))}
						</ul>
					)}
				</section>
			) : null}
		</div>
	)
}

export default NotesPage
