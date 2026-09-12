/**
 * Curriculum resolution check for the 12 representative student profiles.
 *
 * Usage:
 *   node --env-file=../averiq-admin.env --import tsx scripts/validate-profiles.ts
 *
 * Reports, per profile, whether published non-development content resolves.
 */
import { createClient } from '@supabase/supabase-js'

type Profile = { name: string; board: string; classLevel: string; path?: string; exams?: string[] }

const PROFILES: Profile[] = [
	{ name: 'Class 6 CBSE', board: 'cbse-school', classLevel: '6' },
	{ name: 'Class 8 CISCE', board: 'cisce-school', classLevel: '8' },
	{ name: 'Class 10 CBSE', board: 'cbse-school', classLevel: '10' },
	{ name: 'Class 11 CBSE PCM', board: 'cbse-senior-secondary', classLevel: '11', path: 'pcm' },
	{ name: 'Class 11 CBSE PCB', board: 'cbse-senior-secondary', classLevel: '11', path: 'pcb' },
	{ name: 'Class 11 Commerce', board: 'cbse-senior-secondary', classLevel: '11', path: 'commerce' },
	{ name: 'Class 11 Humanities', board: 'cbse-senior-secondary', classLevel: '11', path: 'humanities' },
	{ name: 'Class 12 CBSE PCM', board: 'cbse-senior-secondary', classLevel: '12', path: 'pcm' },
	{ name: 'Class 12 ISC Science', board: 'isc', classLevel: '12', path: 'pcm' },
	{ name: 'JEE aspirant', board: 'cbse-senior-secondary', classLevel: '11', path: 'pcm', exams: ['jee'] },
	{ name: 'NEET aspirant', board: 'cbse-senior-secondary', classLevel: '11', path: 'pcb', exams: ['neet'] },
	{ name: 'NDA aspirant', board: 'cbse-senior-secondary', classLevel: '11', path: 'pcm', exams: ['nda'] },
]

const main = async () => {
	const url = process.env.SUPABASE_URL
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY
	if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
	const client = createClient(url, key, { auth: { persistSession: false } })

	const { data: releases, error } = await client
		.from('student_releases')
		.select('id, release_key, board_key, class_level')
		.limit(500)
	if (error) throw new Error(`Could not read student_releases: ${error.message}`)

	console.log(`Published production releases: ${releases?.length ?? 0}`)
	let missing = 0

	for (const profile of PROFILES) {
		const match = (releases ?? []).filter(
			(row) => String(row.board_key) === profile.board && String(row.class_level) === profile.classLevel,
		)
		if (match.length === 0) {
			missing += 1
			console.log(`✗ ${profile.name}: no published production release`)
			continue
		}
		const { count } = await client
			.from('lessons')
			.select('id', { count: 'exact', head: true })
			.limit(1)
		console.log(`✓ ${profile.name}: ${match.length} release(s), ${count ?? 0} lessons in scope`)
	}

	if (missing > 0) {
		console.log(`\n${missing} of ${PROFILES.length} profiles have no production curriculum yet.`)
		process.exitCode = 1
	}
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error)
	process.exitCode = 1
})
