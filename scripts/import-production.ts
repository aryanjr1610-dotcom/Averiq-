/**
 * Batch curriculum/content importer for production data.
 *
 * Usage:
 *   node --env-file=../averiq-admin.env --import tsx scripts/import-production.ts <bundle.json> [--commit]
 *
 * Defaults to a dry run. Every batch is validated before the next one is sent,
 * and each batch carries a digest so retries are idempotent.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

type Row = Record<string, unknown>

type Batch = {
	kind: 'curriculum' | 'chapters' | 'formulas' | 'questions' | 'revision'
	label: string
	source: { name: string; url: string; publishedOn?: string }
	rows: Row[]
}

type Bundle = {
	releaseKey: string
	academicYear: string
	boardKey: string
	classLevel: string
	batches: Batch[]
}

const REQUIRED: Record<Batch['kind'], string[]> = {
	curriculum: ['subjectSlug', 'subjectName'],
	chapters: ['subjectSlug', 'chapterSlug', 'chapterTitle', 'position'],
	formulas: ['subjectSlug', 'formulaSlug', 'name', 'latex'],
	questions: ['chapterSlug', 'questionType', 'prompt', 'answer', 'sourceType'],
	revision: ['chapterSlug', 'kind', 'summary'],
}

const digest = (value: unknown): string => {
	const text = JSON.stringify(value)
	let hash = 0x811c9dc5
	for (let i = 0; i < text.length; i += 1) hash = ((hash ^ text.charCodeAt(i)) * 16777619) >>> 0
	return `${hash.toString(16)}-${text.length.toString(16)}`
}

const validate = (batch: Batch): string[] => {
	const problems: string[] = []
	if (!batch.source?.url || !/^https?:\/\//.test(batch.source.url)) problems.push(`${batch.label}: official source URL is required`)
	if (!batch.source?.name) problems.push(`${batch.label}: official source name is required`)
	batch.rows.forEach((row, index) => {
		for (const field of REQUIRED[batch.kind]) {
			if (String(row[field] ?? '').trim() === '') problems.push(`${batch.label} row ${index + 1}: missing ${field}`)
		}
		if (batch.kind === 'questions' && row.sourceType === 'pyq') {
			for (const field of ['examKey', 'examYear', 'sourceReference']) {
				if (String(row[field] ?? '').trim() === '') problems.push(`${batch.label} row ${index + 1}: PYQ needs verified ${field}`)
			}
		}
	})
	return problems
}

const main = async () => {
	const [file, ...flags] = process.argv.slice(2)
	if (!file) throw new Error('Usage: import-production.ts <bundle.json> [--commit]')
	const commit = flags.includes('--commit')

	const bundle = JSON.parse(readFileSync(file, 'utf8')) as Bundle
	const url = process.env.SUPABASE_URL
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY
	if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')

	const client = createClient(url, key, { auth: { persistSession: false } })

	console.log(`Bundle ${bundle.releaseKey} · ${bundle.boardKey} class ${bundle.classLevel} · ${bundle.batches.length} batches`)

	let failed = 0
	for (const batch of bundle.batches) {
		const problems = validate(batch)
		if (problems.length > 0) {
			failed += problems.length
			console.error(`✗ ${batch.label}: ${problems.length} problems`)
			problems.slice(0, 10).forEach((problem) => console.error(`   ${problem}`))
			continue
		}
		const batchDigest = digest({ kind: batch.kind, rows: batch.rows })
		console.log(`✓ ${batch.label}: ${batch.rows.length} rows valid (digest ${batchDigest})`)

		if (!commit) continue

		const { error } = await client.rpc('import_academic_bundle', {
			p_import_key: `${bundle.releaseKey}:${batch.kind}:${batchDigest}`,
			p_digest: batchDigest,
			p_bundle: {
				releaseKey: bundle.releaseKey,
				academicYear: bundle.academicYear,
				boardKey: bundle.boardKey,
				classLevel: bundle.classLevel,
				kind: batch.kind,
				source: batch.source,
				rows: batch.rows,
			},
		})
		if (error) {
			failed += 1
			console.error(`✗ commit ${batch.label}: ${error.message}`)
			break // stop the run instead of leaving a half-imported release
		}
		console.log(`   committed ${batch.label}`)
	}

	console.log(commit ? (failed === 0 ? 'Import committed.' : `Import stopped with ${failed} problems.`) : 'Dry run only — pass --commit to write.')
	if (failed > 0) process.exitCode = 1
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error)
	process.exitCode = 1
})
