import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, advanceStreak, levelProgress, newlyUnlocked, qualifiesForStreak, streakIsAlive, xpFor } from './rules'

describe('gamification rules', () => {
	it('caps farmed XP', () => {
		expect(xpFor({ kind: 'focus', minutes: 300, countedFocusMinutesToday: 118 }, 0)).toBe(2)
		expect(xpFor({ kind: 'lesson_completed' }, 295)).toBe(5)
	})

	it('does not count app opens as activity', () => {
		const idle = { studySeconds: 40, focusSeconds: 0, lessonsCompleted: 0, questionsAnswered: 0, tasksCompleted: 0 }
		expect(qualifiesForStreak(idle)).toBe(false)
		expect(qualifiesForStreak({ ...idle, lessonsCompleted: 1 })).toBe(true)
	})

	it('extends a streak only on consecutive days', () => {
		const day1 = advanceStreak({ current: 0, longest: 0, lastActiveDay: null }, '2026-09-08')
		const day2 = advanceStreak(day1, '2026-09-09')
		const gap = advanceStreak(day2, '2026-09-12')
		expect(day2.current).toBe(2)
		expect(gap.current).toBe(1)
		expect(gap.longest).toBe(2)
		expect(streakIsAlive(day2, '2026-09-10')).toBe(true)
		expect(streakIsAlive(day2, '2026-09-11')).toBe(false)
	})

	it('unlocks achievements once', () => {
		const stats = { lessonsCompleted: 1, chaptersMastered: 0, questionsAnswered: 0, focusSeconds: 0, currentStreak: 1 }
		expect(newlyUnlocked(stats, []).map((a) => a.key)).toEqual(['first_lesson'])
		expect(newlyUnlocked(stats, ['first_lesson'])).toHaveLength(0)
		expect(ACHIEVEMENTS).toHaveLength(5)
	})

	it('levels predictably', () => {
		expect(levelProgress(0).level).toBe(1)
		expect(levelProgress(100).level).toBe(2)
	})
})
