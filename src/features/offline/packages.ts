import { asNumber, asObject, asText, type Row } from '../../lib/db-client'
import { formatBytes, isQuotaError, offlineAvailable, offlineDb, STORES } from './db'
import { curriculumRepository } from '@/features/curriculum/repository'
import type { ReaderBundle } from '@/features/curriculum/model'
import { readerCacheContext, restoreReader } from './reader-cache'

export type PackageType = 'chapter' | 'lesson' | 'revision' | 'formulas' | 'flashcards' | 'practice' | 'model3d'
export type PackageStatus = 'downloading' | 'ready' | 'update_available' | 'failed'

export type OfflinePackage = {
	id: string
	type: PackageType
	entityId: string
	title: string
	version: string
	size: number
	downloadedAt: string
	lastCheckedAt: string
	status: PackageStatus
	error?: string
}

type ContentRecord = { key: string; packageId: string; kind: string; entityId: string; version: string; payload: Row }

const packageId = (type: PackageType, entityId: string): string => `${type}:${entityId}`
const sizeOf = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value ?? null)).length

export const PACKAGE_LABEL: Record<PackageType, string> = {
	chapter: 'Chapter',
	lesson: 'Lesson',
	revision: 'Revision pack',
	formulas: 'Formula pack',
	flashcards: 'Flashcards',
	practice: 'Practice pack',
	model3d: '3D model',
}

/** Fetches only published lesson versions for a chapter - never the whole subject. */
const fetchChapter = async (chapterId: string): Promise<{ title: string; version: string; records: ContentRecord[] }> => {
	const [chapter, outline] = await Promise.all([
		curriculumRepository.getChapter(chapterId),
		curriculumRepository.getOutline(chapterId),
	])
	const rows = outline.flatMap((item) => item.lessons)
	if (rows.length === 0) throw new Error('This chapter has no lessons yet.')
	const reader = await curriculumRepository.getReader(rows[0]!.id)

	const records: ContentRecord[] = []
	let version = '0'
	for (const lesson of rows) {
		const lessonId = lesson.id
		// Latest published version, with the same profile access check as the reader.
		// Fail the package if any lesson fails rather than marking a partial chapter ready.
		const published = await curriculumRepository.getLatestContent(lessonId)
		const versionId = published.id
		version = `${version}|${versionId}`
		records.push({
			key: `lesson:${lessonId}`,
			packageId: packageId('chapter', chapterId),
			kind: 'lesson',
			entityId: lessonId,
			version: versionId,
			payload: { title: lesson.title, document: asObject(published.content), versionMetadata: { ...published, content: undefined } },
		})
	}
	if (records.length === 0) throw new Error('No published content is available for this chapter yet.')
	records.push({ key: `context:${packageId('chapter', chapterId)}`, packageId: packageId('chapter', chapterId), kind: 'chapter-context', entityId: chapterId, version, payload: readerCacheContext({ ...reader, chapter, outline }) })
	return { title: chapter.title, version, records }
}

export const offlinePackages = {
	available: offlineAvailable,

	async list(): Promise<OfflinePackage[]> {
		if (!offlineAvailable()) return []
		const rows = await offlineDb.all<OfflinePackage>(STORES.packages)
		return rows.sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt))
	},

	async get(type: PackageType, entityId: string): Promise<OfflinePackage | undefined> {
		if (!offlineAvailable()) return undefined
		return offlineDb.get<OfflinePackage>(STORES.packages, packageId(type, entityId))
	},

	async downloadChapter(chapterId: string, title?: string): Promise<OfflinePackage> {
		if (!offlineAvailable()) throw new Error('Offline storage is not available in this browser.')
		const id = packageId('chapter', chapterId)
		const now = new Date().toISOString()
		const pending: OfflinePackage = { id, type: 'chapter', entityId: chapterId, title: title ?? 'Chapter', version: '', size: 0, downloadedAt: now, lastCheckedAt: now, status: 'downloading' }
		await offlineDb.put(STORES.packages, pending)
		try {
			const { title: chapterTitle, version, records } = await fetchChapter(chapterId)
			let size = 0
			for (const record of records) {
				await offlineDb.put(STORES.content, record)
				size += sizeOf(record.payload)
			}
			const ready: OfflinePackage = { ...pending, title: title ?? chapterTitle, version, size, status: 'ready', lastCheckedAt: new Date().toISOString() }
			await offlineDb.put(STORES.packages, ready)
			return ready
		} catch (error) {
			const text = isQuotaError(error)
				? 'Not enough device storage. Remove a download and try again.'
				: error instanceof Error
					? error.message
					: 'Download failed.'
			const failed: OfflinePackage = { ...pending, status: 'failed', error: text }
			await offlineDb.put(STORES.packages, failed)
			throw new Error(text)
		}
	},

	/** Compares stored version ids with the server. Never merges mismatched versions. */
	async checkUpdates(): Promise<OfflinePackage[]> {
		const packages = await this.list()
		const updated: OfflinePackage[] = []
		for (const item of packages) {
			if (item.type !== 'chapter' || item.status === 'downloading') continue
			try {
				const { version } = await fetchChapter(item.entityId)
				const next: OfflinePackage = {
					...item,
					lastCheckedAt: new Date().toISOString(),
					status: version === item.version ? 'ready' : 'update_available',
				}
				await offlineDb.put(STORES.packages, next)
				updated.push(next)
			} catch {
				updated.push(item)
			}
		}
		return updated
	},

	async readLesson(lessonId: string): Promise<{ title: string; document: Row; version: string } | null> {
		if (!offlineAvailable()) return null
		const record = await offlineDb.get<ContentRecord>(STORES.content, `lesson:${lessonId}`)
		if (!record) return null
		const payload = asObject(record.payload)
		return { title: asText(payload.title), document: asObject(payload.document), version: record.version }
	},

	/** Restore only complete packages with their actual academic context. */
	async readReader(lessonId: string): Promise<ReaderBundle | null> {
		if (!offlineAvailable()) return null
		const record = await offlineDb.get<ContentRecord>(STORES.content, `lesson:${lessonId}`)
		if (!record) return null
		const item = await offlineDb.get<OfflinePackage>(STORES.packages, record.packageId)
		if (!item || !['ready', 'update_available'].includes(item.status)) return null
		const context = await offlineDb.get<ContentRecord>(STORES.content, `context:${record.packageId}`)
		if (!context || context.version !== item.version) return null
		const payload = asObject(record.payload)
		return restoreReader(context.payload, lessonId, payload.versionMetadata, payload.document)
	},

	async readChapterReader(chapterId: string): Promise<ReaderBundle | null> {
		if (!offlineAvailable()) return null
		const context = await offlineDb.get<ContentRecord>(STORES.content, `context:${packageId('chapter', chapterId)}`)
		const outline = asObject(context?.payload).outline
		if (!Array.isArray(outline)) return null
		const lessons = asObject(outline[0]).lessons
		// Empty topics are allowed; find the first downloaded lesson in source order.
		const first = Array.isArray(lessons) && lessons.length ? asText(asObject(lessons[0]).id) : outline.flatMap((entry) => {
			const values = asObject(entry).lessons
			return Array.isArray(values) ? values.map((lesson) => asText(asObject(lesson).id)) : []
		})[0]
		return first ? this.readReader(first) : null
	},

	/** Offline search over downloaded lessons only. Server search stays unavailable offline. */
	async searchDownloaded(query: string): Promise<Array<{ lessonId: string; title: string }>> {
		if (!offlineAvailable() || query.trim().length < 2) return []
		const records = await offlineDb.all<ContentRecord>(STORES.content)
		const needle = query.trim().toLowerCase()
		return records
			.filter((record) => record.kind === 'lesson')
			.map((record) => ({ lessonId: record.entityId, title: asText(asObject(record.payload).title) }))
			.filter((item) => item.title.toLowerCase().includes(needle))
			.slice(0, 20)
	},

	async remove(id: string): Promise<void> {
		if (!offlineAvailable()) return
		const records = await offlineDb.all<ContentRecord>(STORES.content)
		for (const record of records) if (record.packageId === id) await offlineDb.remove(STORES.content, record.key)
		await offlineDb.remove(STORES.packages, id)
	},

	async totalSize(): Promise<number> {
		const packages = await this.list()
		return packages.reduce((sum, item) => sum + asNumber(item.size), 0)
	},

	label: (item: OfflinePackage): string => `${PACKAGE_LABEL[item.type]} · ${formatBytes(item.size)}`,
}
