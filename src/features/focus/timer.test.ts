import { describe, expect, it } from 'vitest'
import { cancel, createFocusState, elapsedMs, finish, focusSeconds, pause, remainingMs, resume } from './timer'

const base = createFocusState({ plannedMinutes: 25, now: 1_000_000 })

describe('focus timer', () => {
	it('derives elapsed time from timestamps', () => {
		expect(elapsedMs(base, 1_000_000 + 60_000)).toBe(60_000)
	})

	it('does not accrue time while paused', () => {
		const paused = pause(base, 1_000_000 + 60_000)
		expect(elapsedMs(paused, 1_000_000 + 300_000)).toBe(60_000)
		const resumed = resume(paused, 1_000_000 + 300_000)
		expect(elapsedMs(resumed, 1_000_000 + 360_000)).toBe(120_000)
	})

	it('never returns negative remaining time', () => {
		expect(remainingMs(base, 1_000_000 + 60 * 60_000)).toBe(0)
	})

	it('records seconds on finish and cancel without drift', () => {
		const done = finish(base, 1_000_000 + 90_000)
		expect(done.status).toBe('completed')
		expect(focusSeconds(done, 9_999_999)).toBe(90)
		expect(cancel(base, 1_000_000 + 30_000).status).toBe('cancelled')
	})
})
