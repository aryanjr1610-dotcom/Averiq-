import { useSyncOnReconnect } from './useOffline'
import './offline.css'

export const OfflineIndicator = () => {
	const { online, pending, last } = useSyncOnReconnect()

	if (online && pending === 0 && (!last || last.conflicts === 0)) return null

	return (
		<div className="off-bar" role="status" aria-live="polite">
			{!online ? (
				<span>You're offline. Downloaded chapters, notes and revision packs still work.</span>
			) : pending > 0 ? (
				<span>{pending} change{pending === 1 ? '' : 's'} waiting to sync.</span>
			) : (
				<span>{last?.conflicts} item{last?.conflicts === 1 ? '' : 's'} kept locally because the server copy is newer.</span>
			)}
		</div>
	)
}

export const OfflineAiNotice = () => {
	const { online } = useSyncOnReconnect()
	if (online) return null
	return <p className="off-note">Averiq AI requires an internet connection.</p>
}
