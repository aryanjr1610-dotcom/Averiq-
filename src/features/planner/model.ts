import { addDays, localDay } from '../../lib/day'

export type TaskType = 'study' | 'revision' | 'practice' | 'assignment' | 'test' | 'custom'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'normal' | 'high'
export type Recurrence = 'none' | 'daily' | 'weekly'

export type StudyTask = {
	id: string
	title: string
	description: string | null
	type: TaskType
	status: TaskStatus
	priority: TaskPriority
	dueAt: string | null
	scheduledDate: string | null
	estimatedMinutes: number | null
	subjectId: string | null
	chapterId: string | null
	lessonId: string | null
	recurrence: Recurrence
	reminderAt: string | null
	reminderEnabled: boolean
	completedAt: string | null
	createdAt: string
}

export type TaskDraft = {
	title: string
	type: TaskType
	scheduledDate: string | null
	dueAt?: string | null
	estimatedMinutes?: number | null
	priority?: TaskPriority
	description?: string | null
	subjectId?: string | null
	chapterId?: string | null
	lessonId?: string | null
	recurrence?: Recurrence
}

export const TASK_TYPES: TaskType[] = ['study', 'revision', 'practice', 'assignment', 'test', 'custom']

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
	study: 'Study',
	revision: 'Revision',
	practice: 'Practice',
	assignment: 'Assignment',
	test: 'Test',
	custom: 'Other',
}

export const isActive = (task: StudyTask): boolean =>
	task.status === 'pending' || task.status === 'in_progress'

/** Overdue is derived, never stored. */
export const isOverdue = (task: StudyTask, now: Date = new Date()): boolean => {
	if (!isActive(task)) return false
	if (task.dueAt) return new Date(task.dueAt).getTime() < now.getTime()
	if (task.scheduledDate) return task.scheduledDate < localDay(now)
	return false
}

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, normal: 1, low: 2 }

export const sortTasks = (tasks: StudyTask[], now: Date = new Date()): StudyTask[] =>
	[...tasks].sort((a, b) => {
		const overdue = Number(isOverdue(b, now)) - Number(isOverdue(a, now))
		if (overdue !== 0) return overdue
		const done = Number(a.status === 'completed') - Number(b.status === 'completed')
		if (done !== 0) return done
		const priority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
		if (priority !== 0) return priority
		return (a.dueAt ?? a.scheduledDate ?? '9999') < (b.dueAt ?? b.scheduledDate ?? '9999') ? -1 : 1
	})

export type TodayView = {
	day: string
	scheduled: StudyTask[]
	overdue: StudyTask[]
	completed: StudyTask[]
	plannedMinutes: number
}

export const buildToday = (tasks: StudyTask[], day: string, now: Date = new Date()): TodayView => {
	const scheduled: StudyTask[] = []
	const overdue: StudyTask[] = []
	const completed: StudyTask[] = []
	for (const task of tasks) {
		if (task.status === 'cancelled') continue
		const onDay = task.scheduledDate === day || (task.dueAt ?? '').slice(0, 10) === day
		if (task.status === 'completed') {
			if (onDay || (task.completedAt ?? '').slice(0, 10) === day) completed.push(task)
			continue
		}
		if (isOverdue(task, now)) overdue.push(task)
		else if (onDay) scheduled.push(task)
	}
	const plannedMinutes = [...scheduled, ...overdue].reduce(
		(sum, task) => sum + (task.estimatedMinutes ?? 0),
		0,
	)
	return {
		day,
		scheduled: sortTasks(scheduled, now),
		overdue: sortTasks(overdue, now),
		completed: sortTasks(completed, now),
		plannedMinutes,
	}
}

/** Only daily/weekly repeats are supported on purpose. */
export const nextOccurrence = (task: StudyTask): string | null => {
	if (task.recurrence === 'none' || !task.scheduledDate) return null
	return addDays(task.scheduledDate, task.recurrence === 'daily' ? 1 : 7)
}

export const countByDay = (tasks: StudyTask[]): Record<string, number> => {
	const map: Record<string, number> = {}
	for (const task of tasks) {
		if (task.status === 'cancelled') continue
		const day = task.scheduledDate ?? (task.dueAt ? task.dueAt.slice(0, 10) : null)
		if (!day) continue
		map[day] = (map[day] ?? 0) + 1
	}
	return map
}
