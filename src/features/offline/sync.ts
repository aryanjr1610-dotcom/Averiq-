import { check, db } from '../../lib/db-client'
import { offlineAvailable, offlineDb, STORES } from './db'

export type QueuedWrite = {
	id?: number
	table: string
	op: 'insert' | 'upsert' | 'update'
	values: Record<string, unknown>
	conflict?: string
	match?: Record<string, unknown>
	/** Client timestamp used for last-write-wins comparison against the server row. */
	updatedAt: string
	compareColumn?: string
	attempts: number
}

export type SyncResult = { flushed: number; kept: number; conflicts: number; failed: number }

export const syncQueue = {
	async enqueue(entry: Omit<QueuedWrite, 'attempts'>): Promise<void> {
		if (!offlineAvailable()) throw new Error('Offline queue unavailable')
		await offlineDb.put(STORES.queue, { ...entry, attempts: 0 })
	},

	async pending(): Promise<QueuedWrite[]> {
		if (!offlineAvailable()) return []
		return offlineDb.all<QueuedWrite>(STORES.queue)
	},

	/** Never overwrites newer server data blindly and never discards local edits silently. */
	async flush(): Promise<SyncResult> {
		const entries = await this.pending()
		let flushed = 0
		let kept = 0
		let conflicts = 0
		let failed = 0

		for (const entry of entries) {
			try {
				if (entry.compareColumn && entry.match) {
					let query = db().from(entry.table).select(entry.compareColumn)
					for (const [column, value] of Object.entries(entry.match)) query = query.eq(column, value)
					const existing = await query.maybeSingle()
					const serverStamp = existing.data ? String(existing.data[entry.compareColumn] ?? '') : ''
					if (serverStamp && serverStamp > entry.updatedAt) {
						conflicts += 1
						kept += 1
						continue // keep the local copy; the user resolves it explicitly
					}
				}

				let write = db().from(entry.table)
				if (entry.op === 'insert') write = write.insert(entry.values)
				else if (entry.op === 'upsert') write = write.upsert(entry.values, entry.conflict ? { onConflict: entry.conflict } : undefined)
				else {
					write = write.update(entry.values)
					for (const [column, value] of Object.entries(entry.match ?? {})) write = write.eq(column, value)
				}
				const result = await write
				check(result.error, `Sync failed for ${entry.table}`)
				if (entry.id !== undefined) await offlineDb.remove(STORES.queue, entry.id)
				flushed += 1
			} catch {
				failed += 1
				if (entry.id !== undefined) await offlineDb.put(STORES.queue, { ...entry, attempts: entry.attempts + 1 })
			}
		}

		return { flushed, kept, conflicts, failed }
	},

	async count(): Promise<number> {
		return (await this.pending()).length
	},
}
