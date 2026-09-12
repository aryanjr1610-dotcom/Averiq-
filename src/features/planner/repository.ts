import { getSupabase } from '../../lib/supabase'
import type { Recurrence, StudyTask, TaskDraft, TaskPriority, TaskStatus, TaskType } from './model'

type Row = Record<string, unknown>
type QueryResult<T> = { data: T | null; error: { message: string; code?: string } | null }

interface Query extends PromiseLike<QueryResult<Row[]>> {
	select(columns?: string): Query
	insert(values: Row | Row[]): Query
	update(values: Row): Query
	upsert(values: Row | Row[], options?: Row): Query
	delete(): Query
	eq(column: string, value: unknown): Query
	gte(column: string, value: unknown): Query
	lte(column: string, value: unknown): Query
	in(column: string, values: readonly unknown[]): Query
	order(column: string, options?: Row): Query
	limit(count: number): Query
	maybeSingle(): PromiseLike<QueryResult<Row>>
	single(): PromiseLike<QueryResult<Row>>
}

interface Client {
	from(table: string): Query
}

const client = (): Client => getSupabase() as unknown as Client

const text = (value: unknown): string => (typeof value === 'string' ? value : '')
const nullableText = (value: unknown): string | null => (typeof value === 'string' ? value : null)
const nullableNumber = (value: unknown): number | null =>
	typeof value === 'number' && Number.isFinite(value) ? value : null

const toTask = (row: Row): StudyTask => ({
	id: text(row.id),
	title: text(row.title),
	description: nullableText(row.description),
	type: (text(row.task_type) || 'study') as TaskType,
	status: (text(row.status) || 'pending') as TaskStatus,
	priority: (text(row.priority) || 'normal') as TaskPriority,
	dueAt: nullableText(row.due_at),
	scheduledDate: nullableText(row.scheduled_date),
	estimatedMinutes: nullableNumber(row.estimated_minutes),
	subjectId: nullableText(row.subject_id),
	chapterId: nullableText(row.chapter_id),
	lessonId: nullableText(row.lesson_id),
	recurrence: (text(row.recurrence) || 'none') as Recurrence,
	reminderAt: nullableText(row.reminder_at),
	reminderEnabled: row.reminder_enabled === true,
	completedAt: nullableText(row.completed_at),
	createdAt: text(row.created_at),
})

const failed = (error: { message: string } | null, action: string): void => {
	if (error) throw new Error(`${action}: ${error.message}`)
}

export const plannerRepository = {
	async listRange(userId: string, fromDay: string, toDay: string): Promise<StudyTask[]> {
		// Range query + open tasks (which may be older than the window).
		const scheduled = await client()
			.from('study_tasks')
			.select('*')
			.eq('user_id', userId)
			.gte('scheduled_date', fromDay)
			.lte('scheduled_date', toDay)
			.order('scheduled_date', { ascending: true })
			.limit(300)
		failed(scheduled.error, 'Could not load planner tasks')

		const open = await client()
			.from('study_tasks')
			.select('*')
			.eq('user_id', userId)
			.in('status', ['pending', 'in_progress'])
			.order('created_at', { ascending: false })
			.limit(200)
		failed(open.error, 'Could not load open tasks')

		const byId = new Map<string, StudyTask>()
		for (const row of [...(scheduled.data ?? []), ...(open.data ?? [])]) {
			const task = toTask(row)
			byId.set(task.id, task)
		}
		return [...byId.values()]
	},

	async create(userId: string, draft: TaskDraft): Promise<StudyTask> {
		const result = await client()
			.from('study_tasks')
			.insert({
				user_id: userId,
				title: draft.title.trim().slice(0, 200),
				description: draft.description ?? null,
				task_type: draft.type,
				priority: draft.priority ?? 'normal',
				scheduled_date: draft.scheduledDate,
				due_at: draft.dueAt ?? null,
				estimated_minutes: draft.estimatedMinutes ?? null,
				subject_id: draft.subjectId ?? null,
				chapter_id: draft.chapterId ?? null,
				lesson_id: draft.lessonId ?? null,
				recurrence: draft.recurrence ?? 'none',
			})
			.select('*')
			.single()
		failed(result.error, 'Could not create the task')
		if (!result.data) throw new Error('Could not create the task')
		return toTask(result.data)
	},

	async setStatus(taskId: string, status: TaskStatus): Promise<void> {
		const result = await client()
			.from('study_tasks')
			.update({
				status,
				completed_at: status === 'completed' ? new Date().toISOString() : null,
			})
			.eq('id', taskId)
		failed(result.error, 'Could not update the task')
	},

	async reschedule(taskId: string, day: string | null): Promise<void> {
		const result = await client().from('study_tasks').update({ scheduled_date: day }).eq('id', taskId)
		failed(result.error, 'Could not reschedule the task')
	},

	async remove(taskId: string): Promise<void> {
		const result = await client().from('study_tasks').delete().eq('id', taskId)
		failed(result.error, 'Could not delete the task')
	},
}
