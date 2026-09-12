import { useCallback, useEffect, useRef, useState } from 'react'
import { offlinePackages, type OfflinePackage } from './packages'
import { syncQueue, type SyncResult } from './sync'

export const useOnlineStatus = (): boolean => {
	const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
	useEffect(() => {
		const up = () => setOnline(true)
		const down = () => setOnline(false)
		window.addEventListener('online', up)
		window.addEventListener('offline', down)
		return () => {
			window.removeEventListener('online', up)
			window.removeEventListener('offline', down)
		}
	}, [])
	return online
}

/** Flushes queued writes when the connection returns. */
export const useSyncOnReconnect = () => {
	const online = useOnlineStatus()
	const [pending, setPending] = useState(0)
	const [last, setLast] = useState<SyncResult | null>(null)

	const refresh = useCallback(() => {
		syncQueue.count().then(setPending).catch(() => setPending(0))
	}, [])

	useEffect(() => {
		refresh()
	}, [refresh])

	useEffect(() => {
		if (!online) return
		let cancelled = false
		syncQueue
			.flush()
			.then((result) => {
				if (cancelled) return
				setLast(result)
				refresh()
			})
			.catch(() => undefined)
		return () => {
			cancelled = true
		}
	}, [online, refresh])

	return { online, pending, last, refresh }
}

export const useDownloads = () => {
	const [packages, setPackages] = useState<OfflinePackage[] | null>(null)
	const [message, setMessage] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)
	const [loadFailed, setLoadFailed] = useState(false)
	const pending = useRef(false)

	const refresh = useCallback(() => {
		setLoadFailed(false)
		offlinePackages
			.list()
			.then(setPackages)
			.catch(() => { setLoadFailed(true); setMessage('Your downloads could not be loaded. Try again.'); })
	}, [])

	useEffect(() => {
		refresh()
	}, [refresh])

	const download = useCallback(
		async (chapterId: string, title?: string) => {
			if (pending.current) return
			pending.current = true
			setBusy(true)
			setMessage('Downloading…')
			try {
				await offlinePackages.downloadChapter(chapterId, title)
				setMessage('Saved for offline use.')
			} catch (error) {
				setMessage(error instanceof Error ? error.message : 'Download failed.')
			} finally {
				pending.current = false
				setBusy(false)
			}
			refresh()
		},
		[refresh],
	)

	const remove = useCallback(
		async (id: string) => {
			if (pending.current) return
			pending.current = true
			setBusy(true)
			try {
				await offlinePackages.remove(id)
				setMessage('Download removed.')
				refresh()
			} catch {
				setMessage('The download could not be removed. Try again.')
			} finally {
				pending.current = false
				setBusy(false)
			}
		},
		[refresh],
	)

	const checkUpdates = useCallback(async () => {
		if (pending.current) return
		pending.current = true
		setBusy(true)
		setMessage('Checking for updates…')
		try {
			const result = await offlinePackages.checkUpdates()
			setPackages(result)
			const stale = result.filter((item) => item.status === 'update_available').length
			setMessage(stale > 0 ? `${stale} download${stale === 1 ? '' : 's'} have newer content.` : 'No newer content was found in the checked downloads.')
		} catch {
			setMessage('Updates could not be checked. Reconnect and try again.')
		} finally {
			pending.current = false
			setBusy(false)
		}
	}, [])

	return { packages, message, busy, loadFailed, download, remove, checkUpdates, refresh, available: offlinePackages.available() }
}
