import { getSupabase } from '../../lib/supabase'
import { localDay } from '../../lib/day'
import {
	ACHIEVEMENTS,
	advanceStreak,
	levelFor,
	newlyUnlocked,
	qualifiesForStreak,
	xpFor,
	type AchievementDefinition,
	type DayStats,
	type StreakState,
	type XpEvent,
} from './rules'

type Row = Record<string, unknown>
type QueryResult<T> = { data: T | null; error: { message: string } | null }

interface Query extends PromiseLike<QueryResult<Row[]>> {
	select(columns?: string): Query
	insert(values: Row | Row[]): Query
	update(values: Row): Query
	upsert(values: Row | Row[], options?: Row): Query
	eq(column: string, value: unknown): Query
	gte(column: string, value: unknown): Query
	order(column: string, options?: Row): Query
	limit(count: number): Query
	maybeSingle(): PromiseLike<QueryResult<Row>>
}

interface Client {
	from(table: string): Query
}

const client = (): Client => getSupabase() as unknown as Client
const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0)
const str = (value: unknown): string | null => (typeof value === 'string' ? value : null)

export type GamificationSummary = {
	day: string
	today: DayStats & { xpEarned: number }
	streak: StreakState
	totalXp: number
	level: number
	unlocked: string[]
	recentDays: Array<{ day: string; focusSeconds: number; studySeconds: number }>
}

export const gamificationRepository = {
	async summary(userId: string): Promise<GamificationSummary> {
		const day = localDay()
		const [activity, streakRow, xpRow, achievements, recent] = await Promise.all([
			client().from('daily_activity').select('*').eq('user_id', userId).eq('day', day).maybeSingle(),
			client().from('user_streaks').select('*').eq('user_id', userId).maybeSingle(),
			client().from('user_xp').select('*').eq('user_id', userId).maybeSingle(),
			client().from('user_achievements').select('achievement_key').eq('user_id', userId).limit(50),
			client()
				.from('daily_activity')
				.select('day, focus_seconds, study_seconds')
				.eq('user_id', userId)
				.order('day', { ascending: false })
				.limit(14),
		])

		const a = activity.data ?? {}
		const s = streakRow.data ?? {}
		const x = xpRow.data ?? {}
		return {
			day,
			today: {
				studySeconds: num(a.study_seconds),
				focusSeconds: num(a.focus_seconds),
				lessonsCompleted: num(a.lessons_completed),
				questionsAnswered: num(a.questions_answered),
				tasksCompleted: num(a.tasks_completed),
				xpEarned: num(a.xp_earned),
			},
			streak: {
				current: num(s.current_streak),
				longest: num(s.longest_streak),
				lastActiveDay: str(s.last_active_day),
			},
			totalXp: num(x.total_xp),
			level: num(x.level) || 1,
			unlocked: (achievements.data ?? [])
				.map((row) => str(row.achievement_key))
				.filter((key): key is string => key !== null),
			recentDays: (recent.data ?? []).map((row) => ({
				day: str(row.day) ?? '',
				focusSeconds: num(row.focus_seconds),
				studySeconds: num(row.study_seconds),
			})),
		}
	},

	/**
	 * Records one meaningful activity: updates the day rollup, XP, streak and
	 * any achievement unlocks. Safe to call fire-and-forget from feature code.
	 */
	async record(
		userId: string,
		event: XpEvent,
		delta: Partial<DayStats> = {},
	): Promise<{ xpAwarded: number; unlocked: AchievementDefinition[] }> {
		const current = await gamificationRepository.summary(userId)
		const countedFocusMinutes = Math.floor(current.today.focusSeconds / 60)
		const enriched: XpEvent =
			event.kind === 'focus'
				? { ...event, countedFocusMinutesToday: countedFocusMinutes }
				: event.kind === 'practice_session'
					? { ...event, countedQuestionsToday: current.today.questionsAnswered }
					: event
		const xpAwarded = xpFor(enriched, current.today.xpEarned)

		const nextDay: DayStats & { xpEarned: number } = {
			studySeconds: Math.min(86_400, current.today.studySeconds + (delta.studySeconds ?? 0)),
			focusSeconds: Math.min(86_400, current.today.focusSeconds + (delta.focusSeconds ?? 0)),
			lessonsCompleted: current.today.lessonsCompleted + (delta.lessonsCompleted ?? 0),
			questionsAnswered: current.today.questionsAnswered + (delta.questionsAnswered ?? 0),
			tasksCompleted: current.today.tasksCompleted + (delta.tasksCompleted ?? 0),
			xpEarned: Math.min(5000, current.today.xpEarned + xpAwarded),
		}

		await client()
			.from('daily_activity')
			.upsert(
				{
					user_id: userId,
					day: current.day,
					xp_earned: nextDay.xpEarned,
					study_seconds: nextDay.studySeconds,
					focus_seconds: nextDay.focusSeconds,
					lessons_completed: nextDay.lessonsCompleted,
					questions_answered: nextDay.questionsAnswered,
					tasks_completed: nextDay.tasksCompleted,
				},
				{ onConflict: 'user_id,day' },
			)

		if (xpAwarded > 0) {
			const totalXp = current.totalXp + xpAwarded
			await client()
				.from('user_xp')
				.upsert({ user_id: userId, total_xp: totalXp, level: levelFor(totalXp) }, { onConflict: 'user_id' })
		}

		if (qualifiesForStreak(nextDay)) {
			const next = advanceStreak(current.streak, current.day)
			if (next !== current.streak) {
				await client().from('user_streaks').upsert(
					{
						user_id: userId,
						current_streak: next.current,
						longest_streak: next.longest,
						last_active_day: next.lastActiveDay,
					},
					{ onConflict: 'user_id' },
				)
				current.streak = next
			}
		}

		const unlocked = newlyUnlocked(
			{
				lessonsCompleted: nextDay.lessonsCompleted,
				chaptersMastered: 0,
				questionsAnswered: nextDay.questionsAnswered,
				focusSeconds: nextDay.focusSeconds,
				currentStreak: current.streak.current,
			},
			current.unlocked,
		)
		if (unlocked.length > 0) {
			await client()
				.from('user_achievements')
				.upsert(
					unlocked.map((item) => ({ user_id: userId, achievement_key: item.key })),
					{ onConflict: 'user_id,achievement_key' },
				)
		}
		return { xpAwarded, unlocked }
	},

	definitions: ACHIEVEMENTS,
}
