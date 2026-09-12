import { asNumber, asObject, asText, check, db, type Row } from '../../lib/db-client'

const PAGE = 50

export type ListPage<T> = { rows: T[]; hasMore: boolean }

const page = async (table: string, columns: string, filters: Array<[string, unknown]>, order: string, offset: number): Promise<ListPage<Row>> => {
	let query = db().from(table).select(columns)
	for (const [column, value] of filters) if (value !== null && value !== undefined) query = query.eq(column, value)
	const result = await query.order(order, { ascending: true }).range(offset, offset + PAGE)
	check(result.error, `Could not load ${table}`)
	const rows = result.data ?? []
	return { rows: rows.slice(0, PAGE), hasMore: rows.length > PAGE }
}

export type ChecklistItem =
	| 'curriculum' | 'learn_content' | 'formulae' | 'derivations' | 'revision' | 'quick_revision'
	| 'flashcards' | 'questions' | 'visual_2d' | 'visual_3d' | 'academic_review' | 'published'

export type ChecklistState = 'missing' | 'draft' | 'ready' | 'published' | 'not_applicable'

export const CHECKLIST_ITEMS: ChecklistItem[] = [
	'curriculum', 'learn_content', 'formulae', 'derivations', 'revision', 'quick_revision',
	'flashcards', 'questions', 'visual_2d', 'visual_3d', 'academic_review', 'published',
]

export const CHECKLIST_LABEL: Record<ChecklistItem, string> = {
	curriculum: 'Curriculum',
	learn_content: 'Learn content',
	formulae: 'Formulae',
	derivations: 'Derivations',
	revision: 'Revision',
	quick_revision: 'Quick revision',
	flashcards: 'Flashcards',
	questions: 'Questions',
	visual_2d: '2D visual',
	visual_3d: '3D visual',
	academic_review: 'Academic review',
	published: 'Published',
}

export const adminRepository = {
	listSubjects: (offset = 0) => page('subjects', 'id, name, slug, status', [], 'name', offset),
	listChapters: (subjectId: string | null, offset = 0) => page('chapters', 'id, title, status, course_id, position', subjectId ? [] : [], 'position', offset),
	listLessons: (chapterId: string | null, offset = 0) => page('lessons', 'id, title, status, chapter_id, position', chapterId ? [['chapter_id', chapterId]] : [], 'position', offset),

	async draftCounts(): Promise<{ drafts: number; review: number; published: number }> {
		const counts = await Promise.all(
			['draft', 'review', 'published'].map(async (status) => {
				const result = await db().from('lesson_versions').select('id').eq('status', status).limit(500)
				return result.error ? 0 : (result.data ?? []).length
			}),
		)
		return { drafts: counts[0] ?? 0, review: counts[1] ?? 0, published: counts[2] ?? 0 }
	},

	async checklist(boardKey: string | null, classLevel: string | null) {
		let query = db().from('content_checklist').select('*')
		if (boardKey) query = query.eq('board_key', boardKey)
		if (classLevel) query = query.eq('class_level', classLevel)
		const result = await query.order('subject_id', { ascending: true }).limit(1000)
		check(result.error, 'Could not load the completeness tracker')
		return (result.data ?? []).map((row) => ({
			id: asText(row.id),
			boardKey: asText(row.board_key),
			classLevel: asText(row.class_level),
			subjectId: asText(row.subject_id),
			chapterId: asText(row.chapter_id),
			item: asText(row.item) as ChecklistItem,
			state: asText(row.state) as ChecklistState,
			note: asText(row.note),
		}))
	},

	async setChecklist(input: { boardKey: string; classLevel: string; subjectId: string; chapterId: string; item: ChecklistItem; state: ChecklistState; userId: string }) {
		const result = await db().from('content_checklist').upsert(
			{
				board_key: input.boardKey,
				class_level: input.classLevel,
				subject_id: input.subjectId,
				chapter_id: input.chapterId,
				item: input.item,
				state: input.state,
				updated_by: input.userId,
				updated_at: new Date().toISOString(),
			},
			{ onConflict: 'chapter_id,item' },
		)
		check(result.error, 'Could not update the checklist')
	},

	async releaseMatrix() {
		const result = await db().from('release_matrix').select('*').order('board_key', { ascending: true }).limit(500)
		check(result.error, 'Could not load the release matrix')
		return (result.data ?? []).map((row) => ({
			boardKey: asText(row.board_key),
			classLevel: asText(row.class_level),
			subjectId: asText(row.subject_id),
			chapters: asNumber(row.chapters),
			requiredItems: asNumber(row.required_items),
			publishedItems: asNumber(row.published_items),
			outstanding: asNumber(row.outstanding_items),
			percent: asNumber(row.percent_complete),
		}))
	},

	async recentAudit() {
		const result = await db().from('content_audit_log').select('*').order('created_at', { ascending: false }).limit(30)
		check(result.error, 'Could not load the audit log')
		return (result.data ?? []).map((row) => ({
			id: asText(row.id),
			action: asText(row.action),
			entityType: asText(row.entity_type),
			entityId: asText(row.entity_id),
			summary: asText(row.summary),
			createdAt: asText(row.created_at),
		}))
	},

	async loadLessonDraft(lessonId: string) {
		const result = await db().from('lesson_versions').select('*').eq('lesson_id', lessonId).order('created_at', { ascending: false }).limit(5)
		check(result.error, 'Could not load lesson versions')
		return (result.data ?? []).map((row) => ({
			id: asText(row.id),
			status: asText(row.status),
			document: asObject(row.document),
			createdAt: asText(row.created_at),
		}))
	},

	async saveLessonDraft(versionId: string, document: Row) {
		const result = await db().from('lesson_versions').update({ document }).eq('id', versionId).eq('status', 'draft')
		check(result.error, 'Could not save the draft')
	},

	async setVersionStatus(versionId: string, status: 'draft' | 'review' | 'approved' | 'changes_requested') {
		const result = await db().from('lesson_versions').update({ status }).eq('id', versionId)
		check(result.error, 'Could not update the review status')
	},

	/** Publishing always goes through the Phase 6 RPC, never a direct status write. */
	async publishVersion(versionId: string) {
		const result = await db().rpc('publish_lesson_version', { p_id: versionId })
		check(result.error, 'Could not publish this version')
	},

	async comments(entityType: string, entityId: string) {
		const result = await db().from('review_comments').select('*').eq('entity_type', entityType).eq('entity_id', entityId).order('created_at', { ascending: true }).limit(100)
		check(result.error, 'Could not load review comments')
		return (result.data ?? []).map((row) => ({ id: asText(row.id), body: asText(row.body), status: asText(row.status), blockId: asText(row.block_id), createdAt: asText(row.created_at) }))
	},

	async addComment(input: { entityType: string; entityId: string; blockId?: string | null; body: string; author: string }) {
		const result = await db().from('review_comments').insert({
			entity_type: input.entityType,
			entity_id: input.entityId,
			block_id: input.blockId ?? null,
			body: input.body.slice(0, 4000),
			author: input.author,
		})
		check(result.error, 'Could not add the comment')
	},

	async recordImport(input: { kind: string; sourceLabel: string; digest: string; status: 'validated' | 'committed' | 'failed'; stats: Row; error?: string; userId: string }) {
		const result = await db().from('import_jobs').upsert(
			{
				kind: input.kind,
				source_label: input.sourceLabel,
				digest: input.digest,
				status: input.status,
				stats: input.stats,
				error: input.error ?? null,
				created_by: input.userId,
			},
			{ onConflict: 'kind,digest' },
		)
		check(result.error, 'Could not record the import job')
	},
}
