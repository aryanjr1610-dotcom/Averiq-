import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { getSupabase } from '../../lib/supabase'
import { progressRepository } from '../progress/repository'
import { gamificationRepository } from '../gamification/repository'
import {
	FOCUS_PRESETS,
	MIN_RECORDED_SECONDS,
	cancel,
	createFocusState,
	finish,
	focusSeconds,
	formatClock,
	pause,
	persistFocus,
	remainingMs,
	restoreFocus,
	resume,
	type FocusState,
} from './timer'
import './focus.css'

type Row = Record<string, unknown>
interface Query extends PromiseLike<{ data: Row[] | null; error: { message: string } | null }> {
	insert(values: Row): Query
	update(values: Row): Query
	select(columns?: string): Query
	eq(column: string, value: unknown): Query
	single(): PromiseLike<{ data: Row | null; error: { message: string } | null }>
}
interface Client {
	from(table: string): Query
}
const client = (): Client => getSupabase() as unknown as Client

export const FocusPage = () => {
	const { user } = useAuth()
	const userId = user?.id ?? null
	const [params] = useSearchParams()
	const taskId = params.get('task')
	const [state, setState] = useState<FocusState | null>(() => restoreFocus())
	const [label, setLabel] = useState('Focus session')
	const [minutes, setMinutes] = useState(25)
	const [custom, setCustom] = useState('')
	const [distractionFree, setDistractionFree] = useState(false)
	const [note, setNote] = useState<string | null>(null)
	const [, setTick] = useState(0)
	const savingRef = useRef(false)

	useEffect(() => {
		persistFocus(state)
	}, [state])

	// Re-render once a second only to repaint the clock; time itself is derived.
	useEffect(() => {
		if (!state || state.status !== 'running') return undefined
		const id = window.setInterval(() => setTick((value) => value + 1), 1000)
		return () => window.clearInterval(id)
	}, [state])

	const start = useCallback(async () => {
		if (!userId) return
		const next = createFocusState({ label, plannedMinutes: minutes, taskId })
		setState(next)
		setNote(null)
		try {
			const result = await client()
				.from('focus_sessions')
				.insert({
					user_id: userId,
					task_id: taskId,
					label: next.label,
					planned_minutes: next.plannedMinutes,
					started_at: new Date(next.startedAt).toISOString(),
					status: 'running',
				})
				.select('id')
				.single()
			const id = typeof result.data?.id === 'string' ? result.data.id : null
			if (id) setState((current) => (current ? { ...current, sessionId: id } : current))
		} catch {
			setNote('Timer running locally - this session could not be saved yet.')
		}
	}, [userId, label, minutes, taskId])

	const close = useCallback(
		async (mode: 'completed' | 'cancelled') => {
			if (!state || !userId || savingRef.current) return
			savingRef.current = true
			const ended = mode === 'completed' ? finish(state) : cancel(state)
			const seconds = focusSeconds(ended)
			setState(null)
			persistFocus(null)
			try {
				if (ended.sessionId) {
					await client()
						.from('focus_sessions')
						.update({
							status: mode,
							ended_at: new Date().toISOString(),
							paused_ms: ended.pausedMs,
							focus_seconds: seconds,
						})
						.eq('id', ended.sessionId)
				}
				if (mode === 'completed' && seconds >= MIN_RECORDED_SECONDS) {
					await progressRepository.recordSession({ activityType: 'focus', activeSeconds: seconds, startedAt: new Date(ended.startedAt).toISOString() })
					await progressRepository.logActivity({ kind: 'focus_completed', metadata: { seconds, taskId } })
					const result = await gamificationRepository.record(
						userId,
						{ kind: 'focus', minutes: seconds / 60, countedFocusMinutesToday: 0 },
						{ focusSeconds: seconds, studySeconds: seconds },
					)
					setNote(
						result.unlocked.length > 0
							? `Session saved. Unlocked: ${result.unlocked.map((item) => item.title).join(', ')}.`
							: `Session saved · ${Math.round(seconds / 60)} min${result.xpAwarded > 0 ? ` · +${result.xpAwarded} XP` : ''}`,
					)
				} else if (mode === 'completed') {
					setNote('Session was under a minute, so it was not counted.')
				} else {
					setNote('Session cancelled.')
				}
			} catch (error) {
				setNote(error instanceof Error ? error.message : 'Could not save this session.')
			} finally {
				savingRef.current = false
			}
		},
		[state, userId, taskId],
	)

	const remaining = state ? remainingMs(state) : minutes * 60_000
	const finished = state !== null && remaining === 0

	useEffect(() => {
		if (finished && state?.status === 'running') void close('completed')
	}, [finished, state, close])

	const presetButtons = useMemo(() => [...FOCUS_PRESETS], [])

	if (!userId) return <p className="focus-note">Sign in to track focus sessions.</p>

	return (
		<div className={`focus${distractionFree ? ' focus--calm' : ''}`}>
			<header className="focus-head">
				<h1>Focus</h1>
				<p className="focus-note">Timed, honest and interruption-friendly. Pausing never loses your time.</p>
			</header>

			<div className="focus-stage">
				<p className="focus-clock" aria-live="polite">
					{formatClock(remaining)}
				</p>
				<p className="focus-label">{state ? state.label : label}</p>

				{!state ? (
					<>
						<div className="focus-presets" role="group" aria-label="Session length">
							{presetButtons.map((preset) => (
								<button
									key={preset}
									type="button"
									className={`focus-chip${minutes === preset ? ' focus-chip--on' : ''}`}
									onClick={() => setMinutes(preset)}
									aria-pressed={minutes === preset}
								>
									{preset} min
								</button>
							))}
							<label className="focus-custom">
								<span className="focus-visually-hidden">Custom minutes</span>
								<input
									value={custom}
									inputMode="numeric"
									placeholder="Custom"
									onChange={(event) => {
										setCustom(event.target.value)
										const parsed = Number.parseInt(event.target.value, 10)
										if (Number.isFinite(parsed)) setMinutes(Math.min(240, Math.max(5, parsed)))
									}}
								/>
							</label>
						</div>
						<label className="focus-field">
							<span className="focus-visually-hidden">What are you focusing on?</span>
							<input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={160} placeholder="What are you focusing on?" />
						</label>
						<button type="button" className="focus-primary" onClick={() => void start()}>
							Start
						</button>
					</>
				) : (
					<div className="focus-actions">
						{state.status === 'running' ? (
							<button type="button" className="focus-secondary" onClick={() => setState(pause(state))}>
								Pause
							</button>
						) : (
							<button type="button" className="focus-secondary" onClick={() => setState(resume(state))}>
								Resume
							</button>
						)}
						<button type="button" className="focus-primary" onClick={() => void close('completed')}>
							Finish
						</button>
						<button type="button" className="focus-ghost" onClick={() => void close('cancelled')}>
							Cancel
						</button>
					</div>
				)}

				<label className="focus-toggle">
					<input type="checkbox" checked={distractionFree} onChange={(event) => setDistractionFree(event.target.checked)} />
					Distraction-reduced view
				</label>
				{note ? (
					<p className="focus-note" role="status">
						{note}
					</p>
				) : null}
			</div>
		</div>
	)
}

export default FocusPage
