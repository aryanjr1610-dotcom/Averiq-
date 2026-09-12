/** Single source of truth for "what day is it for this student". */
export const localDay = (date: Date = new Date()): string =>
	date.toLocaleDateString('en-CA') // YYYY-MM-DD in the browser's local calendar

export const parseDay = (day: string): Date => {
	const parts = day.split('-').map((part) => Number.parseInt(part, 10))
	const y = parts[0] ?? 2026
	const m = parts[1] ?? 1
	const d = parts[2] ?? 1
	return new Date(y, m - 1, d)
}

export const addDays = (day: string, delta: number): string => {
	const date = parseDay(day)
	date.setDate(date.getDate() + delta)
	return localDay(date)
}

export const daysBetween = (from: string, to: string): number => {
	const a = parseDay(from).getTime()
	const b = parseDay(to).getTime()
	return Math.round((b - a) / 86_400_000)
}

export const startOfMonth = (day: string): string => `${day.slice(0, 7)}-01`

export const monthLabel = (day: string): string =>
	parseDay(day).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

export const dayLabel = (day: string): string =>
	parseDay(day).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

/** Weeks (Mon-first) covering the month that contains `day`. */
export const monthGrid = (day: string): string[][] => {
	const first = parseDay(startOfMonth(day))
	const offset = (first.getDay() + 6) % 7
	const cursorStart = addDays(localDay(first), -offset)
	const weeks: string[][] = []
	let cursor = cursorStart
	for (let w = 0; w < 6; w += 1) {
		const week: string[] = []
		for (let i = 0; i < 7; i += 1) {
			week.push(cursor)
			cursor = addDays(cursor, 1)
		}
		weeks.push(week)
		if (cursor.slice(0, 7) !== day.slice(0, 7) && w >= 3) break
	}
	return weeks
}
