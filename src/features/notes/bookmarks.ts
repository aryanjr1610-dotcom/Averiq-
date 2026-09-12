import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { notesRepository } from './repository'
import type { BookmarkEntity } from './model'

/** Small hook so any surface can offer a consistent bookmark toggle. */
export const useBookmark = (
	entityType: BookmarkEntity,
	entityId: string | null,
	meta?: { title?: string | null; route?: string | null },
) => {
	const { user } = useAuth()
	const userId = user?.id ?? null
	const [saved, setSaved] = useState(false)
	const [busy, setBusy] = useState(false)

	useEffect(() => {
		let active = true
		if (!userId || !entityId) {
			setSaved(false)
			return () => {
				active = false
			}
		}
		notesRepository
			.listBookmarks(userId)
			.then((items) => {
				if (active) setSaved(items.some((item) => item.entityType === entityType && item.entityId === entityId))
			})
			.catch(() => {
				if (active) setSaved(false)
			})
		return () => {
			active = false
		}
	}, [userId, entityType, entityId])

	const toggle = useCallback(async () => {
		if (!userId || !entityId || busy) return
		setBusy(true)
		const next = !saved
		setSaved(next)
		try {
			if (next) {
				await notesRepository.addBookmark(userId, {
					entityType,
					entityId,
					title: meta?.title ?? null,
					route: meta?.route ?? null,
				})
			} else {
				await notesRepository.removeBookmark(userId, entityType, entityId)
			}
		} catch {
			setSaved(!next)
		} finally {
			setBusy(false)
		}
	}, [userId, entityId, entityType, saved, busy, meta?.title, meta?.route])

	return { saved, busy, toggle, available: Boolean(userId && entityId) }
}
