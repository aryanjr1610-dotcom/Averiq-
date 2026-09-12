import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { addDays, dayLabel, localDay, monthGrid, monthLabel, parseDay } from '../../lib/day'
import { gamificationRepository } from '../gamification/repository'
import { plannerRepository } from './repository'
import {
	buildToday,
	countByDay,
	isOverdue,
	nextOccurrence,
	TASK_TYPES,
	TASK_TYPE_LABEL,
	type StudyTask,
	type TaskType,
} from './model'
import './planner.css'

const QuickAdd = ({ day, onCreate }: { day: string; onCreate: (title: string, type: TaskType, minutes: number | null) => void }) => {
	const [title, setTitle] = useState('')
	const [type, setType] = useState<TaskType>('study')
	const [minutes, setMinutes] = useState('')

	return (
		<form
			className="plan-add"
			onSubmit={(event) => {
				event.preventDefault()
				const trimmed = title.trim()
				if (!trimmed) return
				const parsed = Number.parseInt(minutes, 10)
				onCreate(trimmed, type, Number.isFinite(parsed) ? parsed : null)
				setTitle('')
				setMinutes('')
			}}
		>
			<label className="plan-field">
				<span className="plan-label">Add a task for {dayLabel(day)}</span>
				<input
					value={title}
					onChange={(event) => setTitle(event.target.value)}
					placeholder="Revise Electrostatics derivations"
					maxLength={200}
				/>
			</label>
			<label className="plan-field plan-field--sm">
				<span className="plan-label">Type</span>
				<select value={type} onChange={(event) => setType(event.target.value as TaskType)}>
					{TASK_TYPES.map((item) => (
						<option key={item} value={item}>
							{TASK_TYPE_LABEL[item]}
						</option>
					))}
				</select>
			</label>
			<label className="plan-field plan-field--sm">
				<span className="plan-label">Minutes</span>
				<input value={minutes} onChange={(event) => setMinutes(event.target.value)} inputMode="numeric" placeholder="30" />
			</label>
			<button type="submit" className="plan-primary">
				Add
			</button>
		</form>
	)
}

const TaskRow = ({
	task,
	onToggle,
	onDelete,
}: {
	task: StudyTask
	onToggle: (task: StudyTask) => void
	onDelete: (task: StudyTask) => void
}) => (
	<li className={`plan-task${task.status === 'completed' ? ' plan-task--done' : ''}`}>
		<label className="plan-check">
			<input
				type="checkbox"
				checked={task.status === 'completed'}
				onChange={() => onToggle(task)}
				aria-label={`Mark "${task.title}" ${task.status === 'completed' ? 'not done' : 'done'}`}
			/>
			<span>
				<span className="plan-task__title">{task.title}</span>
				<span className="plan-task__meta">
					{TASK_TYPE_LABEL[task.type]}
					{task.estimatedMinutes ? ` · ${task.estimatedMinutes} min` : ''}
					{isOverdue(task) ? ' · Overdue' : ''}
					{task.recurrence !== 'none' ? ` · Repeats ${task.recurrence}` : ''}
				</span>
			</span>
		</label>
		<div className="plan-task__actions">
			{task.lessonId ? (
				<Link className="plan-link" to={`/app/learn/lessons/${task.lessonId}`}>
					Open
				</Link>
			) : null}
			<Link className="plan-link" to={`/app/focus?task=${task.id}`}>
				Focus
			</Link>
			<button type="button" className="plan-ghost" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`}>
				Remove
			</button>
		</div>
	</li>
)

export const PlannerPage = () => {
	const { user } = useAuth()
	const userId = user?.id ?? null
	const [tasks, setTasks] = useState<StudyTask[]>([])
	const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
	const [message, setMessage] = useState<string | null>(null)
	const [day, setDay] = useState(localDay())
	const [month, setMonth] = useState(localDay())

	const load = useCallback(async () => {
		if (!userId) return
		setStatus('loading')
		try {
			const from = addDays(`${month.slice(0, 7)}-01`, -7)
			const to = addDays(`${month.slice(0, 7)}-01`, 45)
			setTasks(await plannerRepository.listRange(userId, from, to))
			setStatus('ready')
			setMessage(null)
		} catch (error) {
			setStatus('error')
			setMessage(error instanceof Error ? error.message : 'Could not load your planner.')
		}
	}, [userId, month])

	useEffect(() => {
		void load()
	}, [load])

	const today = useMemo(() => buildToday(tasks, day), [tasks, day])
	const counts = useMemo(() => countByDay(tasks), [tasks])
	const grid = useMemo(() => monthGrid(month), [month])

	const create = async (title: string, type: TaskType, minutes: number | null) => {
		if (!userId) return
		try {
			const task = await plannerRepository.create(userId, {
				title,
				type,
				scheduledDate: day,
				estimatedMinutes: minutes,
			})
			setTasks((prev) => [...prev, task])
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not add the task.')
		}
	}

	const toggle = async (task: StudyTask) => {
		if (!userId) return
		const next = task.status === 'completed' ? 'pending' : 'completed'
		setTasks((prev) =>
			prev.map((item) => (item.id === task.id ? { ...item, status: next, completedAt: next === 'completed' ? new Date().toISOString() : null } : item)),
		)
		try {
			await plannerRepository.setStatus(task.id, next)
			if (next === 'completed') {
				void gamificationRepository.record(userId, { kind: 'task_completed' }, { tasksCompleted: 1 })
				const repeat = nextOccurrence(task)
				if (repeat) {
					const clone = await plannerRepository.create(userId, {
						title: task.title,
						type: task.type,
						scheduledDate: repeat,
						estimatedMinutes: task.estimatedMinutes,
						recurrence: task.recurrence,
						subjectId: task.subjectId,
						chapterId: task.chapterId,
						lessonId: task.lessonId,
					})
					setTasks((prev) => [...prev, clone])
				}
			}
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not update the task.')
			void load()
		}
	}

	const remove = async (task: StudyTask) => {
		setTasks((prev) => prev.filter((item) => item.id !== task.id))
		try {
			await plannerRepository.remove(task.id)
		} catch {
			void load()
		}
	}

	if (!userId) return <p className="plan-note">Sign in to use your planner.</p>

	return (
		<div className="plan">
			<header className="plan-head">
				<h1>Planner</h1>
				<p className="plan-note">
					{today.plannedMinutes > 0
						? `${today.plannedMinutes} minutes planned for ${dayLabel(day)}.`
						: `Nothing planned for ${dayLabel(day)} yet.`}
				</p>
			</header>

			{message ? (
				<p className="plan-note plan-note--warn" role="status">
					{message}{' '}
					<button type="button" className="plan-ghost" onClick={() => void load()}>
						Retry
					</button>
				</p>
			) : null}

			<QuickAdd day={day} onCreate={(title, type, minutes) => void create(title, type, minutes)} />

			<div className="plan-columns">
				<section className="plan-block" aria-labelledby="plan-today">
					<h2 id="plan-today">Today</h2>
					{status === 'loading' ? <p className="plan-note">Loading…</p> : null}
					{status === 'ready' && today.overdue.length > 0 ? (
						<>
							<h3 className="plan-sub">Overdue</h3>
							<ul className="plan-list">
								{today.overdue.map((task) => (
									<TaskRow key={task.id} task={task} onToggle={(t) => void toggle(t)} onDelete={(t) => void remove(t)} />
								))}
							</ul>
						</>
					) : null}
					{status === 'ready' ? (
						<>
							<h3 className="plan-sub">Scheduled</h3>
							{today.scheduled.length === 0 ? (
								<p className="plan-note">Add one task above to start the day with a clear target.</p>
							) : (
								<ul className="plan-list">
									{today.scheduled.map((task) => (
										<TaskRow key={task.id} task={task} onToggle={(t) => void toggle(t)} onDelete={(t) => void remove(t)} />
									))}
								</ul>
							)}
							{today.completed.length > 0 ? (
								<>
									<h3 className="plan-sub">Completed</h3>
									<ul className="plan-list">
										{today.completed.map((task) => (
											<TaskRow key={task.id} task={task} onToggle={(t) => void toggle(t)} onDelete={(t) => void remove(t)} />
										))}
									</ul>
								</>
							) : null}
						</>
					) : null}
					<Link className="plan-primary plan-primary--link" to="/app/focus">
						Start a focus session
					</Link>
				</section>

				<section className="plan-block" aria-labelledby="plan-month">
					<div className="plan-month-head">
						<h2 id="plan-month">{monthLabel(month)}</h2>
						<div className="plan-month-nav">
							<button type="button" className="plan-ghost" onClick={() => setMonth(addDays(`${month.slice(0, 7)}-01`, -1))}>
								Previous
							</button>
							<button type="button" className="plan-ghost" onClick={() => setMonth(addDays(`${month.slice(0, 7)}-28`, 7))}>
								Next
							</button>
						</div>
					</div>
					<div className="plan-grid" role="grid" aria-label="Month calendar">
						{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
							<span key={label} className="plan-grid__head">
								{label}
							</span>
						))}
						{grid.flat().map((cell) => {
							const inMonth = cell.slice(0, 7) === month.slice(0, 7)
							const count = counts[cell] ?? 0
							return (
								<button
									key={cell}
									type="button"
									className={`plan-cell${cell === day ? ' plan-cell--on' : ''}${inMonth ? '' : ' plan-cell--muted'}`}
									onClick={() => setDay(cell)}
									aria-pressed={cell === day}
									aria-label={`${dayLabel(cell)}${count ? `, ${count} tasks` : ''}`}
								>
									<span>{parseDay(cell).getDate()}</span>
									{count > 0 ? <span className="plan-dot" aria-hidden="true" /> : null}
								</button>
							)
						})}
					</div>
				</section>
			</div>
		</div>
	)
}

export default PlannerPage
