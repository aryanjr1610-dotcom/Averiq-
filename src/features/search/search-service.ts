import { getSupabase } from '../../lib/supabase'
import { notesRepository } from '../notes/repository'
import { noteHeading } from '../notes/model'
import { offlinePackages } from '../offline/packages'

export type SearchGroupKey = 'learning' | 'formulae' | 'practice' | 'visuals' | 'notes'

export type SearchHit = {
	id: string
	group: SearchGroupKey
	title: string
	subtitle?: string | null
	route: string
}

export const GROUP_LABEL: Record<SearchGroupKey, string> = {
	learning: 'Learning',
	formulae: 'Formulae & derivations',
	practice: 'Practice',
	visuals: 'Visuals',
	notes: 'My notes',
}

/**
 * Phase 9-11 features live in a separate delivery, so they register their own
 * search providers instead of this module querying unknown tables.
 */
export type SearchProvider = (query: string, limit: number) => Promise<SearchHit[]>
const providers = new Map<string, SearchProvider>()

export const registerSearchProvider = (key: string, provider: SearchProvider): void => {
	providers.set(key, provider)
}

/** Small static list so the search route never imports the 2D/3D engines. */
const VISUALS: Array<{ id: string; title: string; subtitle: string }> = [
	{ id: 'electric-field-2d', title: 'Electric field (2D)', subtitle: 'Physics · Electrostatics' },
	{ id: 'electric-field-3d', title: 'Electric field (3D)', subtitle: 'Physics · Electrostatics' },
	{ id: 'sine-graph', title: 'Sine graph explorer', subtitle: 'Mathematics · Trigonometry' },
	{ id: 'animal-cell-overview', title: 'Animal cell diagram', subtitle: 'Biology · Cell structure' },
	{ id: 'anatomy-heart-2d', title: 'Heart explorer', subtitle: 'Anatomy · Circulatory system' },
]

type Row = Record<string, unknown>
interface Client {
	rpc(fn: string, args?: Row): PromiseLike<{ data: Row[] | null; error: { message: string } | null }>
}
const client = (): Client => getSupabase() as unknown as Client

const str = (value: unknown): string => (typeof value === 'string' ? value : '')

export type SearchOutcome = {
	hits: SearchHit[]
	degraded: string[]
}

export const runSearch = async (rawQuery: string, userId: string | null, limit = 8): Promise<SearchOutcome> => {
	const query = rawQuery.trim()
	if (query.length < 2) return { hits: [], degraded: [] }
	const degraded: string[] = []
	const hits: SearchHit[] = []

	// Published curriculum via Postgres full-text search (or IndexedDB offline).
	if (typeof navigator !== 'undefined' && !navigator.onLine) {
		try {
			const local = await offlinePackages.searchDownloaded(query)
			hits.push(...local.map((item) => ({ id: item.lessonId, group: 'learning' as const, title: item.title, subtitle: 'Downloaded', route: `/app/learn/lessons/${item.lessonId}` })))
			degraded.push('Offline — searching downloaded content only.')
		} catch {
			degraded.push('Offline search unavailable.')
		}
	} else {
		try {
			const result = await client().rpc('search_published', { p_query: query, p_limit: limit * 2 })
			if (result.error) throw new Error(result.error.message)
			for (const row of result.data ?? []) {
				hits.push({
					id: `${str(row.entity_type)}:${str(row.entity_id)}`,
					group: 'learning',
					title: str(row.title),
					subtitle: str(row.subtitle) || str(row.chapter) || str(row.subject) || null,
					route: str(row.route),
				})
			}
		} catch {
			degraded.push('Learning content search is unavailable right now.')
		}
	}

	// Personal notes (owner-only, never merged server-side).
	if (userId) {
		try {
			const notes = await notesRepository.searchNotes(userId, query)
			for (const note of notes.slice(0, limit)) {
				hits.push({
					id: `note:${note.id}`,
					group: 'notes',
					title: noteHeading(note),
					subtitle: note.lessonId ? 'Note from a lesson' : 'Personal note',
					route: `/app/notes?note=${note.id}`,
				})
			}
		} catch {
			degraded.push('Your notes could not be searched right now.')
		}
	}

	const lower = query.toLowerCase()
	for (const visual of VISUALS) {
		if (visual.title.toLowerCase().includes(lower) || visual.subtitle.toLowerCase().includes(lower)) {
			hits.push({
				id: `visual:${visual.id}`,
				group: 'visuals',
				title: visual.title,
				subtitle: visual.subtitle,
				route: `/app/visual-lab/${visual.id}`,
			})
		}
	}

	for (const [key, provider] of providers) {
		try {
			hits.push(...(await provider(query, limit)))
		} catch {
			degraded.push(`${key} search is unavailable right now.`)
		}
	}

	return { hits, degraded }
}

export const groupHits = (hits: SearchHit[]): Array<{ key: SearchGroupKey; items: SearchHit[] }> => {
	const order: SearchGroupKey[] = ['learning', 'formulae', 'practice', 'visuals', 'notes']
	return order
		.map((key) => ({ key, items: hits.filter((hit) => hit.group === key) }))
		.filter((group) => group.items.length > 0)
}
