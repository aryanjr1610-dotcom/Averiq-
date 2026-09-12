import { addDays, daysBetween } from '../../lib/day'

/** Every reward value lives here - never inline XP numbers in components. */
export const XP_CONFIG = {
	lessonCompleted: 25,
	chapterCompleted: 60,
	practiceQuestion: 2,
	practiceSessionCompleted: 15,
	revisionCompleted: 12,
	flashcardsCompleted: 10,
	taskCompleted: 8,
	focusMinute: 1,
	dailyCap: 300,
	focusMinutesCountedPerDay: 120,
	practiceQuestionsCountedPerDay: 60,
} as const

export type XpEvent =
	| { kind: 'lesson_completed' }
	| { kind: 'chapter_completed' }
	| { kind: 'practice_session'; questions: number; countedQuestionsToday: number }
	| { kind: 'revision_completed' }
	| { kind: 'flashcards_completed' }
	| { kind: 'task_completed' }
	| { kind: 'focus'; minutes: number; countedFocusMinutesToday: number }

/** Returns XP for the event after anti-farming caps, plus the daily cap. */
export const xpFor = (event: XpEvent, xpAlreadyEarnedToday: number): number => {
	let raw = 0
	if (event.kind === 'lesson_completed') raw = XP_CONFIG.lessonCompleted
	else if (event.kind === 'chapter_completed') raw = XP_CONFIG.chapterCompleted
	else if (event.kind === 'revision_completed') raw = XP_CONFIG.revisionCompleted
	else if (event.kind === 'flashcards_completed') raw = XP_CONFIG.flashcardsCompleted
	else if (event.kind === 'task_completed') raw = XP_CONFIG.taskCompleted
	else if (event.kind === 'practice_session') {
		const room = Math.max(0, XP_CONFIG.practiceQuestionsCountedPerDay - event.countedQuestionsToday)
		raw = XP_CONFIG.practiceSessionCompleted + Math.min(event.questions, room) * XP_CONFIG.practiceQuestion
	} else {
		const room = Math.max(0, XP_CONFIG.focusMinutesCountedPerDay - event.countedFocusMinutesToday)
		raw = Math.min(Math.floor(event.minutes), room) * XP_CONFIG.focusMinute
	}
	const remaining = Math.max(0, XP_CONFIG.dailyCap - xpAlreadyEarnedToday)
	return Math.min(raw, remaining)
}

/** Level n starts at 100 * n * (n - 1) / 2 XP. Simple and predictable. */
export const xpForLevel = (level: number): number => (100 * level * (level - 1)) / 2

export const levelFor = (totalXp: number): number => {
	let level = 1
	while (xpForLevel(level + 1) <= totalXp && level < 200) level += 1
	return level
}

export const levelProgress = (totalXp: number): { level: number; into: number; needed: number } => {
	const level = levelFor(totalXp)
	const floor = xpForLevel(level)
	const ceiling = xpForLevel(level + 1)
	return { level, into: totalXp - floor, needed: Math.max(1, ceiling - floor) }
}

export type DayStats = {
	studySeconds: number
	focusSeconds: number
	lessonsCompleted: number
	questionsAnswered: number
	tasksCompleted: number
}

/** Opening the app is not activity. Real learning is. */
export const qualifiesForStreak = (stats: DayStats): boolean =>
	stats.studySeconds >= 300 ||
	stats.focusSeconds >= 300 ||
	stats.lessonsCompleted >= 1 ||
	stats.questionsAnswered >= 5 ||
	stats.tasksCompleted >= 1

export type StreakState = { current: number; longest: number; lastActiveDay: string | null }

export const advanceStreak = (state: StreakState, today: string): StreakState => {
	if (state.lastActiveDay === today) return state
	const continued = state.lastActiveDay !== null && daysBetween(state.lastActiveDay, today) === 1
	const current = continued ? state.current + 1 : 1
	return { current, longest: Math.max(state.longest, current), lastActiveDay: today }
}

/** A streak is only alive today or yesterday - no paid freezes, no purchases. */
export const streakIsAlive = (state: StreakState, today: string): boolean =>
	state.lastActiveDay === today || state.lastActiveDay === addDays(today, -1)

export type AchievementStats = {
	lessonsCompleted: number
	chaptersMastered: number
	questionsAnswered: number
	focusSeconds: number
	currentStreak: number
}

export type AchievementDefinition = {
	key: string
	title: string
	description: string
	icon: string
	criteria: (stats: AchievementStats) => boolean
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
	{
		key: 'first_lesson',
		title: 'First Lesson',
		description: 'Finish reading your first lesson.',
		icon: 'BookOpen',
		criteria: (s) => s.lessonsCompleted >= 1,
	},
	{
		key: 'streak_7',
		title: '7-Day Study Streak',
		description: 'Study on seven consecutive days.',
		icon: 'Flame',
		criteria: (s) => s.currentStreak >= 7,
	},
	{
		key: 'practice_100',
		title: '100 Practice Questions',
		description: 'Answer one hundred practice questions.',
		icon: 'Target',
		criteria: (s) => s.questionsAnswered >= 100,
	},
	{
		key: 'focus_10h',
		title: '10 Hours Focused',
		description: 'Complete ten hours of focus sessions.',
		icon: 'Timer',
		criteria: (s) => s.focusSeconds >= 36_000,
	},
	{
		key: 'first_chapter',
		title: 'First Chapter Mastered',
		description: 'Reach strong mastery in a full chapter.',
		icon: 'Award',
		criteria: (s) => s.chaptersMastered >= 1,
	},
]

export const newlyUnlocked = (stats: AchievementStats, unlockedKeys: readonly string[]): AchievementDefinition[] =>
	ACHIEVEMENTS.filter((item) => !unlockedKeys.includes(item.key) && item.criteria(stats))
