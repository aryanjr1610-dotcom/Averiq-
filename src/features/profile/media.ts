import { check, db } from '../../lib/db-client'

const BUCKET = 'profile-media'
export const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024
export const MAX_BANNER_BYTES = 4 * 1024 * 1024

export type MediaKind = 'avatar' | 'banner'

export const validateImage = (file: File, kind: MediaKind): string | null => {
	if (!ALLOWED_TYPES.includes(file.type)) return 'Use a PNG, JPEG or WebP image.'
	const max = kind === 'avatar' ? MAX_AVATAR_BYTES : MAX_BANNER_BYTES
	if (file.size > max) return `Keep the file under ${Math.round(max / (1024 * 1024))} MB.`
	return null
}

/** Lightweight canvas downscale - no new dependency. */
const downscale = async (file: File, maxEdge: number): Promise<Blob> => {
	if (typeof createImageBitmap !== 'function') return file
	try {
		const bitmap = await createImageBitmap(file)
		const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
		if (scale === 1) return file
		const canvas = document.createElement('canvas')
		canvas.width = Math.round(bitmap.width * scale)
		canvas.height = Math.round(bitmap.height * scale)
		const context = canvas.getContext('2d')
		if (!context) return file
		context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
		bitmap.close()
		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.86))
		return blob ?? file
	} catch {
		return file
	}
}

export const profileMedia = {
	/** The path always starts with the authenticated user id, matching the storage policy. */
	async upload(userId: string, kind: MediaKind, file: File): Promise<string> {
		const problem = validateImage(file, kind)
		if (problem) throw new Error(problem)
		const body = await downscale(file, kind === 'avatar' ? 512 : 1600)
		const path = `${userId}/profile/${kind}.webp`
		const upload = await db()
			.storage.from(BUCKET)
			.upload(path, body, { upsert: true, contentType: 'image/webp', cacheControl: '3600' })
		check(upload.error, 'Could not upload the image')
		const { data } = db().storage.from(BUCKET).getPublicUrl(path)
		const url = `${data.publicUrl}?v=${Date.now()}`
		const column = kind === 'avatar' ? 'avatar_url' : 'banner_url'
		let saved = await db().from('profiles').update({ [column]: url }).eq('user_id', userId)
		if (saved.error && (saved.error.code === '42703' || /does not exist/i.test(saved.error.message))) {
			saved = await db().from('profiles').update({ [column]: url }).eq('id', userId)
		}
		check(saved.error, 'Could not save the image')
		return url
	},

	async remove(userId: string, kind: MediaKind): Promise<void> {
		const removed = await db().storage.from(BUCKET).remove([`${userId}/profile/${kind}.webp`])
		check(removed.error, 'Could not remove the image')
		const column = kind === 'avatar' ? 'avatar_url' : 'banner_url'
		let saved = await db().from('profiles').update({ [column]: null }).eq('user_id', userId)
		if (saved.error && (saved.error.code === '42703' || /does not exist/i.test(saved.error.message))) {
			saved = await db().from('profiles').update({ [column]: null }).eq('id', userId)
		}
		check(saved.error, 'Could not update your profile')
	},
}

export const initials = (name: string | null | undefined): string => {
	const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
	if (parts.length === 0) return 'A'
	return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('')
}
