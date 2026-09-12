import { getSupabase } from '../../lib/supabase'
import type { Bookmark, BookmarkEntity, Highlight, HighlightColor, Note, NoteType } from './model'

type Row = Record<string, unknown>
type QueryResult<T> = { data: T | null; error: { message: string } | null }

interface Query extends PromiseLike<QueryResult<Row[]>> {
	select(columns?: string): Query
	insert(values: Row | Row[]): Query
	update(values: Row): Query
	upsert(values: Row | Row[], options?: Row): Query
	delete(): Query
	eq(column: string, value: unknown): Query
	in(column: string, values: readonly unknown[]): Query
	ilike(column: string, pattern: string): Query
	order(column: string, options?: Row): Query
	limit(count: number): Query
	single(): PromiseLike<QueryResult<Row>>
	maybeSingle(): PromiseLike<QueryResult<Row>>
}

interface Client {
	from(table: string): Query
	rpc(fn: string, args?: Row): PromiseLike<QueryResult<Row[]>>
}

const client = (): Client => getSupabase() as unknown as Client

const str = (value: unknown): string => (typeof value === 'string' ? value : '')
const nul = (value: unknown): string | null => (typeof value === 'string' ? value : null)
const fail = (error: { message: string } | null, action: string): void => {
	if (error) throw new Error(`${action}: ${error.message}`)
}

const toNote = (row: Row, tags: string[] = []): Note => ({
	id: str(row.id),
	title: nul(row.title),
	content: str(row.content),
	type: (str(row.note_type) || 'personal') as NoteType,
	subjectId: nul(row.subject_id),
	chapterId: nul(row.chapter_id),
	lessonId: nul(row.lesson_id),
	blockId: nul(row.block_id),
	formulaId: nul(row.formula_id),
	questionId: nul(row.question_id),
	visualizationId: nul(row.visualization_id),
	pinned: row.pinned === true,
	tags,
	createdAt: str(row.created_at),
	updatedAt: str(row.updated_at),
})

const toHighlight = (row: Row): Highlight => ({
	id: str(row.id),
	lessonId: str(row.lesson_id),
	blockId: str(row.block_id),
	contentVersionId: nul(row.content_version_id),
	selectedText: str(row.selected_text),
	textSnapshot: str(row.text_snapshot),
	prefix: nul(row.prefix),
	suffix: nul(row.suffix),
	color: (str(row.color) || 'default') as HighlightColor,
	noteId: nul(row.note_id),
	createdAt: str(row.created_at),
})

const toBookmark = (row: Row): Bookmark => ({
	id: str(row.id),
	entityType: (str(row.entity_type) || 'lesson') as BookmarkEntity,
	entityId: str(row.entity_id),
	title: nul(row.title),
	route: nul(row.route),
	createdAt: str(row.created_at),
})

export type NoteDraft = {
	title?: string | null
	content?: string
	type?: NoteType
	subjectId?: string | null
	chapterId?: string | null
	lessonId?: string | null
	blockId?: string | null
	formulaId?: string | null
	questionId?: string | null
	visualizationId?: string | null
}

export const notesRepository = {
	async listNotes(userId: string): Promise<Note[]> {
		const [notes, links, tags] = await Promise.all([
			client()
				.from('user_notes')
				.select('*')
				.eq('user_id', userId)
				.order('updated_at', { ascending: false })
				.limit(300),
			client().from('note_tags').select('note_id, tag_id').eq('user_id', userId).limit(1000),
			client().from('user_tags').select('id, name').eq('user_id', userId).limit(200),
		])
		fail(notes.error, 'Could not load your notes')

		const tagName = new Map<string, string>()
		for (const row of tags.data ?? []) tagName.set(str(row.id), str(row.name))
		const byNote = new Map<string, string[]>()
		for (const row of links.data ?? []) {
			const name = tagName.get(str(row.tag_id))
			if (!name) continue
			const list = byNote.get(str(row.note_id)) ?? []
			list.push(name)
			byNote.set(str(row.note_id), list)
		}
		return (notes.data ?? []).map((row) => toNote(row, byNote.get(str(row.id)) ?? []))
	},

	async listTags(userId: string): Promise<string[]> {
		const result = await client().from('user_tags').select('name').eq('user_id', userId).order('name').limit(200)
		fail(result.error, 'Could not load tags')
		return (result.data ?? []).map((row) => str(row.name)).filter(Boolean)
	},

	async createNote(userId: string, draft: NoteDraft): Promise<Note> {
		const result = await client()
			.from('user_notes')
			.insert({
				user_id: userId,
				title: draft.title ?? null,
				content: (draft.content ?? '').slice(0, 20000),
				note_type: draft.type ?? 'personal',
				subject_id: draft.subjectId ?? null,
				chapter_id: draft.chapterId ?? null,
				lesson_id: draft.lessonId ?? null,
				block_id: draft.blockId ?? null,
				formula_id: draft.formulaId ?? null,
				question_id: draft.questionId ?? null,
				visualization_id: draft.visualizationId ?? null,
			})
			.select('*')
			.single()
		fail(result.error, 'Could not create the note')
		if (!result.data) throw new Error('Could not create the note')
		return toNote(result.data)
	},

	async saveNote(noteId: string, patch: { title?: string | null; content?: string; pinned?: boolean }): Promise<void> {
		const values: Row = {}
		if (patch.title !== undefined) values.title = patch.title
		if (patch.content !== undefined) values.content = patch.content.slice(0, 20000)
		if (patch.pinned !== undefined) values.pinned = patch.pinned
		if (Object.keys(values).length === 0) return
		const result = await client().from('user_notes').update(values).eq('id', noteId)
		fail(result.error, 'Could not save the note')
	},

	async deleteNote(noteId: string): Promise<void> {
		const result = await client().from('user_notes').delete().eq('id', noteId)
		fail(result.error, 'Could not delete the note')
	},

	async setTags(userId: string, noteId: string, tagNames: string[]): Promise<string[]> {
		const cleaned = [...new Set(tagNames.map((name) => name.trim().slice(0, 40)).filter(Boolean))]
		if (cleaned.length > 0) {
			const upsert = await client()
				.from('user_tags')
				.upsert(
					cleaned.map((name) => ({ user_id: userId, name })),
					{ onConflict: 'user_id,name' },
				)
			fail(upsert.error, 'Could not save tags')
		}
		const existing = await client().from('user_tags').select('id, name').eq('user_id', userId).limit(200)
		fail(existing.error, 'Could not load tags')
		const ids = (existing.data ?? [])
			.filter((row) => cleaned.includes(str(row.name)))
			.map((row) => str(row.id))

		const cleared = await client().from('note_tags').delete().eq('note_id', noteId)
		fail(cleared.error, 'Could not update tags')
		if (ids.length > 0) {
			const linked = await client()
				.from('note_tags')
				.insert(ids.map((tagId) => ({ note_id: noteId, tag_id: tagId, user_id: userId })))
			fail(linked.error, 'Could not update tags')
		}
		return cleaned
	},

	async listHighlights(userId: string, lessonId?: string): Promise<Highlight[]> {
		let query = client().from('user_highlights').select('*').eq('user_id', userId)
		if (lessonId) query = query.eq('lesson_id', lessonId)
		const result = await query.order('created_at', { ascending: false }).limit(300)
		fail(result.error, 'Could not load highlights')
		return (result.data ?? []).map(toHighlight)
	},

	async createHighlight(
		userId: string,
		input: {
			lessonId: string
			blockId: string
			contentVersionId?: string | null
			selectedText: string
			textSnapshot: string
			prefix?: string | null
			suffix?: string | null
			color?: HighlightColor
		},
	): Promise<Highlight> {
		const result = await client()
			.from('user_highlights')
			.insert({
				user_id: userId,
				lesson_id: input.lessonId,
				block_id: input.blockId,
				content_version_id: input.contentVersionId ?? null,
				selected_text: input.selectedText.slice(0, 2000),
				text_snapshot: input.textSnapshot.slice(0, 4000),
				prefix: input.prefix ?? null,
				suffix: input.suffix ?? null,
				color: input.color ?? 'default',
			})
			.select('*')
			.single()
		fail(result.error, 'Could not save the highlight')
		if (!result.data) throw new Error('Could not save the highlight')
		return toHighlight(result.data)
	},

	async deleteHighlight(id: string): Promise<void> {
		const result = await client().from('user_highlights').delete().eq('id', id)
		fail(result.error, 'Could not remove the highlight')
	},

	async listBookmarks(userId: string): Promise<Bookmark[]> {
		const result = await client()
			.from('user_bookmarks')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false })
			.limit(300)
		fail(result.error, 'Could not load bookmarks')
		return (result.data ?? []).map(toBookmark)
	},

	async addBookmark(
		userId: string,
		input: { entityType: BookmarkEntity; entityId: string; title?: string | null; route?: string | null },
	): Promise<void> {
		const result = await client()
			.from('user_bookmarks')
			.upsert(
				{
					user_id: userId,
					entity_type: input.entityType,
					entity_id: input.entityId,
					title: input.title ?? null,
					route: input.route ?? null,
				},
				{ onConflict: 'user_id,entity_type,entity_id' },
			)
		fail(result.error, 'Could not save the bookmark')
	},

	async removeBookmark(userId: string, entityType: BookmarkEntity, entityId: string): Promise<void> {
		const result = await client()
			.from('user_bookmarks')
			.delete()
			.eq('user_id', userId)
			.eq('entity_type', entityType)
			.eq('entity_id', entityId)
		fail(result.error, 'Could not remove the bookmark')
	},

	/** Owner-only note search - never mixed into published results server-side. */
	async searchNotes(userId: string, query: string): Promise<Note[]> {
		const term = query.trim()
		if (!term) return []
		const result = await client()
			.from('user_notes')
			.select('*')
			.eq('user_id', userId)
			.ilike('content', `%${term}%`)
			.order('updated_at', { ascending: false })
			.limit(20)
		fail(result.error, 'Could not search your notes')
		return (result.data ?? []).map((row) => toNote(row))
	},
}
