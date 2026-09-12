import type { Row } from '../../lib/db-client'

export type ImportKind = 'curriculum' | 'chapters' | 'formulas' | 'questions' | 'revision'

export type ValidationIssue = { row: number; field: string; message: string; severity: 'error' | 'warning' }

export type ValidationReport = {
	kind: ImportKind
	total: number
	valid: number
	duplicates: number
	issues: ValidationIssue[]
	digest: string
	rows: Row[]
}

const REQUIRED: Record<ImportKind, string[]> = {
	curriculum: ['boardKey', 'classLevel', 'subjectSlug', 'subjectName', 'sourceUrl', 'sourceName'],
	chapters: ['subjectSlug', 'chapterSlug', 'chapterTitle', 'position'],
	formulas: ['subjectSlug', 'formulaSlug', 'name', 'latex'],
	questions: ['chapterSlug', 'questionType', 'prompt', 'answer', 'sourceType'],
	revision: ['chapterSlug', 'kind', 'summary'],
}

/** Stable digest so a retried import is recognised instead of duplicated. */
export const digestOf = (kind: ImportKind, rows: Row[]): string => {
	const text = `${kind}:${JSON.stringify(rows)}`
	let h1 = 0x811c9dc5
	let h2 = 0x01000193
	for (let i = 0; i < text.length; i += 1) {
		h1 = ((h1 ^ text.charCodeAt(i)) * 16777619) >>> 0
		h2 = ((h2 + text.charCodeAt(i) * (i + 1)) * 2246822519) >>> 0
	}
	return `${h1.toString(16)}-${h2.toString(16)}-${text.length.toString(16)}`
}

export const parseCsv = (text: string): Row[] => {
	const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
	if (lines.length < 2) return []
	const split = (line: string): string[] => {
		const out: string[] = []
		let value = ''
		let quoted = false
		for (let i = 0; i < line.length; i += 1) {
			const char = line[i] ?? ''
			if (char === '"') {
				if (quoted && (line[i + 1] ?? '') === '"') {
					value += '"'
					i += 1
				} else quoted = !quoted
			} else if (char === ',' && !quoted) {
				out.push(value)
				value = ''
			} else value += char
		}
		out.push(value)
		return out.map((item) => item.trim())
	}
	const firstLine = lines[0] ?? ''
	const header = split(firstLine)
	return lines.slice(1).map((line) => {
		const cells = split(line)
		const row: Row = {}
		header.forEach((key, index) => {
			row[key] = cells[index] ?? ''
		})
		return row
	})
}

export const validateImport = (kind: ImportKind, rows: Row[], knownKeys: Set<string> = new Set()): ValidationReport => {
	const issues: ValidationIssue[] = []
	const seen = new Set<string>()
	let valid = 0
	let duplicates = 0

	rows.forEach((row, index) => {
		let ok = true
		for (const field of REQUIRED[kind]) {
			const value = row[field]
			if (value === undefined || value === null || String(value).trim() === '') {
				issues.push({ row: index + 1, field, message: 'Required value is missing', severity: 'error' })
				ok = false
			}
		}
		if (kind === 'curriculum' && !/^https?:\/\//.test(String(row.sourceUrl ?? ''))) {
			issues.push({ row: index + 1, field: 'sourceUrl', message: 'An official source URL is required', severity: 'error' })
			ok = false
		}
		if (kind === 'questions' && String(row.sourceType) === 'pyq') {
			for (const field of ['examKey', 'examYear', 'sourceReference']) {
				if (!String(row[field] ?? '').trim()) {
					issues.push({ row: index + 1, field, message: 'PYQ metadata must be complete and verified', severity: 'error' })
					ok = false
				}
			}
		}
		const key = REQUIRED[kind].map((field) => String(row[field] ?? '')).join('|')
		if (seen.has(key)) {
			duplicates += 1
			issues.push({ row: index + 1, field: 'row', message: 'Duplicate of an earlier row in this file', severity: 'warning' })
		} else if (knownKeys.has(key)) {
			duplicates += 1
			issues.push({ row: index + 1, field: 'row', message: 'Already imported — will be skipped', severity: 'warning' })
		}
		seen.add(key)
		if (ok) valid += 1
	})

	return { kind, total: rows.length, valid, duplicates, issues, digest: digestOf(kind, rows), rows }
}
