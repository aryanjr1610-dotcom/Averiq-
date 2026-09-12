/**
 * Timestamp-based focus timer. Nothing decrements per second: elapsed time is
 * always derived from wall-clock timestamps, so refreshes and route changes
 * cannot corrupt the session.
 */
export const FOCUS_STORAGE_KEY = 'averiq:focus-session:v1'
export const FOCUS_PRESETS = [25, 45, 60] as const
export const MIN_RECORDED_SECONDS = 60

export type FocusStatus = 'running' | 'paused' | 'completed' | 'cancelled'

export type FocusState = {
	sessionId: string | null
	label: string
	taskId: string | null
	subjectId: string | null
	chapterId: string | null
	plannedMinutes: number
	startedAt: number
	pausedMs: number
	pausedAt: number | null
	status: FocusStatus
}

export const createFocusState = (input: {
	label?: string
	plannedMinutes: number
	taskId?: string | null
	subjectId?: string | null
	chapterId?: string | null
	now?: number
}): FocusState => ({
	sessionId: null,
	label: (input.label ?? 'Focus session').slice(0, 160),
	taskId: input.taskId ?? null,
	subjectId: input.subjectId ?? null,
	chapterId: input.chapterId ?? null,
	plannedMinutes: Math.min(240, Math.max(5, Math.round(input.plannedMinutes))),
	startedAt: input.now ?? Date.now(),
	pausedMs: 0,
	pausedAt: null,
	status: 'running',
})

export const elapsedMs = (state: FocusState, now: number = Date.now()): number => {
	const end = state.pausedAt ?? now
	return Math.max(0, end - state.startedAt - state.pausedMs)
}

export const remainingMs = (state: FocusState, now: number = Date.now()): number =>
	Math.max(0, state.plannedMinutes * 60_000 - elapsedMs(state, now))

export const focusSeconds = (state: FocusState, now: number = Date.now()): number =>
	Math.min(86_400, Math.floor(elapsedMs(state, now) / 1000))

export const pause = (state: FocusState, now: number = Date.now()): FocusState =>
	state.status === 'running' ? { ...state, status: 'paused', pausedAt: now } : state

export const resume = (state: FocusState, now: number = Date.now()): FocusState =>
	state.status === 'paused' && state.pausedAt !== null
		? { ...state, status: 'running', pausedMs: state.pausedMs + (now - state.pausedAt), pausedAt: null }
		: state

export const finish = (state: FocusState, now: number = Date.now()): FocusState => ({
	...pause(state, now),
	status: 'completed',
})

export const cancel = (state: FocusState, now: number = Date.now()): FocusState => ({
	...pause(state, now),
	status: 'cancelled',
})

export const formatClock = (ms: number): string => {
	const total = Math.floor(ms / 1000)
	const minutes = Math.floor(total / 60)
	const seconds = total % 60
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const isFocusState = (value: unknown): value is FocusState => {
	if (typeof value !== 'object' || value === null) return false
	const candidate = value as Record<string, unknown>
	return (
		typeof candidate.startedAt === 'number' &&
		typeof candidate.pausedMs === 'number' &&
		typeof candidate.plannedMinutes === 'number' &&
		typeof candidate.status === 'string'
	)
}

export const persistFocus = (state: FocusState | null): void => {
	try {
		if (!state || state.status === 'completed' || state.status === 'cancelled') {
			window.localStorage.removeItem(FOCUS_STORAGE_KEY)
			return
		}
		window.localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(state))
	} catch {
		/* storage unavailable - the timer still works for this page view */
	}
}

export const restoreFocus = (now: number = Date.now()): FocusState | null => {
	try {
		const raw = window.localStorage.getItem(FOCUS_STORAGE_KEY)
		if (!raw) return null
		const parsed: unknown = JSON.parse(raw)
		if (!isFocusState(parsed)) return null
		// Guard against a session left open overnight.
		if (elapsedMs(parsed, now) > 6 * 60 * 60_000) {
			window.localStorage.removeItem(FOCUS_STORAGE_KEY)
			return null
		}
		return parsed
	} catch {
		return null
	}
}
