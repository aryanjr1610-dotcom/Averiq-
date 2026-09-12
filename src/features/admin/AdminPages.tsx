import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { adminRepository, CHECKLIST_ITEMS, CHECKLIST_LABEL, type ChecklistItem, type ChecklistState } from './repository'
import { useRoles } from './roles'
import './admin.css'

const STATES: ChecklistState[] = ['missing', 'draft', 'ready', 'published', 'not_applicable']

export const AdminHome = () => {
	const [counts, setCounts] = useState<{ drafts: number; review: number; published: number } | null>(null)
	const [matrix, setMatrix] = useState<Awaited<ReturnType<typeof adminRepository.releaseMatrix>>>([])
	const [audit, setAudit] = useState<Awaited<ReturnType<typeof adminRepository.recentAudit>>>([])
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		Promise.all([adminRepository.draftCounts(), adminRepository.releaseMatrix(), adminRepository.recentAudit()])
			.then(([c, m, a]) => {
				setCounts(c)
				setMatrix(m)
				setAudit(a)
			})
			.catch((problem: unknown) => setError(problem instanceof Error ? problem.message : 'Could not load CMS data.'))
	}, [])

	return (
		<div className="adm-page">
			<h1>Content operations</h1>
			{error ? <p className="adm-note adm-note--warn">{error}</p> : null}
			<ul className="adm-stats">
				<li><strong>{counts?.drafts ?? '—'}</strong><span>draft versions</span></li>
				<li><strong>{counts?.review ?? '—'}</strong><span>awaiting review</span></li>
				<li><strong>{counts?.published ?? '—'}</strong><span>published versions</span></li>
			</ul>

			<h2>Release matrix</h2>
			{matrix.length === 0 ? (
				<p className="adm-note">No checklist rows yet. Import curriculum, then track deliverables per chapter.</p>
			) : (
				<table className="adm-table">
					<thead>
						<tr><th>Board</th><th>Class</th><th>Subject</th><th>Chapters</th><th>Published</th><th>Outstanding</th><th>Complete</th></tr>
					</thead>
					<tbody>
						{matrix.map((row) => (
							<tr key={`${row.boardKey}-${row.classLevel}-${row.subjectId}`}>
								<td>{row.boardKey}</td><td>{row.classLevel}</td><td>{row.subjectId}</td>
								<td>{row.chapters}</td><td>{row.publishedItems}/{row.requiredItems}</td><td>{row.outstanding}</td><td>{row.percent}%</td>
							</tr>
						))}
					</tbody>
				</table>
			)}

			<h2>Recent changes</h2>
			{audit.length === 0 ? <p className="adm-note">No content changes recorded yet.</p> : (
				<ul className="adm-list">
					{audit.map((entry) => (
						<li key={entry.id}>
							<strong>{entry.action}</strong> {entry.entityType} {entry.entityId ? `· ${entry.entityId.slice(0, 8)}` : ''}
							<span className="adm-meta">{new Date(entry.createdAt).toLocaleString()}{entry.summary ? ` · ${entry.summary}` : ''}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}

export const CurriculumManager = () => {
	const [subjects, setSubjects] = useState<Array<{ id: string; name: string; status: string }>>([])
	const [chapters, setChapters] = useState<Array<{ id: string; title: string; status: string }>>([])
	const [lessons, setLessons] = useState<Array<{ id: string; title: string; status: string }>>([])
	const [chapterId, setChapterId] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		adminRepository
			.listSubjects()
			.then((result) =>
				setSubjects(result.rows.map((row) => ({ id: String(row.id), name: String(row.name ?? row.slug ?? row.id), status: String(row.status ?? 'draft') }))),
			)
			.catch((problem: unknown) => setError(problem instanceof Error ? problem.message : 'Could not load subjects.'))
		adminRepository
			.listChapters(null)
			.then((result) => setChapters(result.rows.map((row) => ({ id: String(row.id), title: String(row.title ?? row.id), status: String(row.status ?? 'draft') }))))
			.catch(() => undefined)
	}, [])

	useEffect(() => {
		if (!chapterId) return
		adminRepository
			.listLessons(chapterId)
			.then((result) => setLessons(result.rows.map((row) => ({ id: String(row.id), title: String(row.title ?? row.id), status: String(row.status ?? 'draft') }))))
			.catch(() => setLessons([]))
	}, [chapterId])

	return (
		<div className="adm-page">
			<h1>Curriculum</h1>
			{error ? <p className="adm-note adm-note--warn">{error}</p> : null}
			<p className="adm-note">Paginated lists only — the full Classes 6–12 dataset is never fetched at once.</p>
			<div className="adm-cols">
				<section>
					<h2>Subjects</h2>
					<ul className="adm-list">
						{subjects.map((subject) => (
							<li key={subject.id}>{subject.name}<span className="adm-meta">{subject.status}</span></li>
						))}
					</ul>
				</section>
				<section>
					<h2>Chapters</h2>
					<ul className="adm-list">
						{chapters.map((chapter) => (
							<li key={chapter.id}>
								<button type="button" className="adm-link" onClick={() => setChapterId(chapter.id)}>{chapter.title}</button>
								<span className="adm-meta">{chapter.status}</span>
							</li>
						))}
					</ul>
				</section>
				<section>
					<h2>Lessons</h2>
					{chapterId === null ? <p className="adm-note">Pick a chapter.</p> : null}
					<ul className="adm-list">
						{lessons.map((lesson) => (
							<li key={lesson.id}>
								<Link className="adm-link" to={`/admin/content/${lesson.id}`}>{lesson.title}</Link>
								<span className="adm-meta">{lesson.status}</span>
							</li>
						))}
					</ul>
				</section>
			</div>
		</div>
	)
}

export const CompletenessPage = () => {
	const { user } = useAuth()
	const { canEdit } = useRoles()
	const [rows, setRows] = useState<Awaited<ReturnType<typeof adminRepository.checklist>>>([])
	const [board, setBoard] = useState('')
	const [error, setError] = useState<string | null>(null)

	const load = useCallback(() => {
		adminRepository
			.checklist(board || null, null)
			.then(setRows)
			.catch((problem: unknown) => setError(problem instanceof Error ? problem.message : 'Could not load the tracker.'))
	}, [board])

	useEffect(() => {
		load()
	}, [load])

	const chapters = [...new Set(rows.map((row) => row.chapterId))]

	return (
		<div className="adm-page">
			<h1>Content completeness</h1>
			{error ? <p className="adm-note adm-note--warn">{error}</p> : null}
			<input className="adm-input" value={board} onChange={(event) => setBoard(event.target.value)} placeholder="Filter by board key" aria-label="Board key" />
			{chapters.length === 0 ? (
				<p className="adm-note">Nothing tracked yet. Rows are created during curriculum import or manually per chapter.</p>
			) : (
				<table className="adm-table">
					<thead>
						<tr><th>Chapter</th>{CHECKLIST_ITEMS.map((item) => <th key={item}>{CHECKLIST_LABEL[item]}</th>)}</tr>
					</thead>
					<tbody>
						{chapters.map((chapter) => {
							const forChapter = rows.filter((row) => row.chapterId === chapter)
							const meta = forChapter[0]
							return (
								<tr key={chapter}>
									<td>{chapter.slice(0, 8)}</td>
									{CHECKLIST_ITEMS.map((item) => {
										const current = forChapter.find((row) => row.item === item)?.state ?? 'missing'
										return (
											<td key={item}>
												<select
													className={`adm-state adm-state--${current}`}
													value={current}
													disabled={!canEdit || !meta}
													aria-label={`${CHECKLIST_LABEL[item]} state`}
													onChange={(event) => {
														if (!meta || !user?.id) return
														const state = event.target.value as ChecklistState
														void adminRepository
															.setChecklist({ ...meta, item: item as ChecklistItem, state, userId: user.id })
															.then(load)
															.catch(() => setError('Could not update that item.'))
													}}
												>
													{STATES.map((state) => (
														<option key={state} value={state}>{state.replace('_', ' ')}</option>
													))}
												</select>
											</td>
										)
									})}
								</tr>
							)
						})}
					</tbody>
				</table>
			)}
			<p className="adm-note">Percentages count applicable items only — anything marked <em>not applicable</em> is excluded instead of failing the chapter.</p>
		</div>
	)
}

export const ReviewPage = () => {
	const { user } = useAuth()
	const { canReview } = useRoles()
	const [lessonId, setLessonId] = useState('')
	const [versions, setVersions] = useState<Awaited<ReturnType<typeof adminRepository.loadLessonDraft>>>([])
	const [comments, setComments] = useState<Awaited<ReturnType<typeof adminRepository.comments>>>([])
	const [body, setBody] = useState('')
	const [message, setMessage] = useState<string | null>(null)

	const load = async () => {
		if (!lessonId.trim()) return
		try {
			setVersions(await adminRepository.loadLessonDraft(lessonId.trim()))
			setComments(await adminRepository.comments('lesson', lessonId.trim()))
			setMessage(null)
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not load that lesson.')
		}
	}

	return (
		<div className="adm-page">
			<h1>Review</h1>
			<div className="adm-row">
				<input className="adm-input" value={lessonId} onChange={(event) => setLessonId(event.target.value)} placeholder="Lesson ID" aria-label="Lesson ID" />
				<button type="button" className="adm-primary" onClick={() => void load()}>Load</button>
			</div>
			{message ? <p className="adm-note adm-note--warn">{message}</p> : null}
			<ul className="adm-list">
				{versions.map((version) => (
					<li key={version.id}>
						{version.status} · {new Date(version.createdAt).toLocaleString()}
						{canReview ? (
							<span className="adm-row">
								<button type="button" className="adm-ghost" onClick={() => void adminRepository.setVersionStatus(version.id, 'changes_requested').then(load)}>Request changes</button>
								<button type="button" className="adm-ghost" onClick={() => void adminRepository.setVersionStatus(version.id, 'approved').then(load)}>Approve</button>
								<button type="button" className="adm-ghost" onClick={() => void adminRepository.publishVersion(version.id).then(load).catch((e: unknown) => setMessage(e instanceof Error ? e.message : 'Publish failed.'))}>Publish</button>
							</span>
						) : null}
					</li>
				))}
			</ul>
			<h2>Comments</h2>
			<ul className="adm-list">
				{comments.map((comment) => (
					<li key={comment.id}>{comment.body}<span className="adm-meta">{comment.status}{comment.blockId ? ` · block ${comment.blockId}` : ''}</span></li>
				))}
			</ul>
			<div className="adm-row">
				<input className="adm-input" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Add a review comment" aria-label="Comment" />
				<button
					type="button"
					className="adm-primary"
					onClick={() => {
						if (!user?.id || !body.trim() || !lessonId.trim()) return
						void adminRepository
							.addComment({ entityType: 'lesson', entityId: lessonId.trim(), body, author: user.id })
							.then(() => {
								setBody('')
								return load()
							})
							.catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Could not comment.'))
					}}
				>
					Comment
				</button>
			</div>
			<p className="adm-note">AI-drafted content stays in draft until a human approves it — publishing always goes through the review RPC.</p>
		</div>
	)
}
