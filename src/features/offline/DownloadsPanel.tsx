import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatBytes, storageEstimate, type StorageEstimate } from './db'
import { PACKAGE_LABEL } from './packages'
import { useDownloads } from './useOffline'
import './offline.css'

export const DownloadsPanel = () => {
	const { packages, message, busy, loadFailed, download, refresh, remove, checkUpdates, available } = useDownloads()
	const [estimate, setEstimate] = useState<StorageEstimate | null>(null)

	useEffect(() => {
		storageEstimate().then(setEstimate).catch(() => setEstimate(null))
	}, [packages])

	if (!available) return <p className="off-note">This browser does not support offline downloads.</p>

	return (
		<div className="off-panel">
			<div className="off-row">
				<h3>Downloads</h3>
				<button type="button" className="off-ghost" disabled={busy} onClick={() => void checkUpdates()}>Check for updates</button>
			</div>
			{estimate ? (
				<p className="off-note">
					Using {formatBytes(estimate.usage)} of about {formatBytes(estimate.quota)} available ({estimate.percent}%).
				</p>
			) : null}
			{message ? <p className="off-note" role="status">{message}</p> : null}

			{loadFailed ? <button type="button" className="off-ghost" onClick={refresh}>Retry loading downloads</button> : packages === null ? (
				<p className="off-note">Loading downloads…</p>
			) : packages.length === 0 ? (
				<p className="off-note">Nothing downloaded yet. Use “Download for offline” on a chapter.</p>
			) : (
				<ul className="off-list">
					{packages.map((item) => (
						<li key={item.id}>
							<div>
								<strong>{item.title}</strong>
								<span className="off-meta">
									{PACKAGE_LABEL[item.type]} · {formatBytes(item.size)} ·{' '}
									{item.status === 'update_available' ? 'Update available' : item.status === 'failed' ? item.error ?? 'Failed' : item.status === 'downloading' ? 'Downloading' : 'Ready'}
								</span>
							</div>
							<div className="off-actions">
								{item.type === 'chapter' && <>
									{['ready', 'update_available'].includes(item.status) && <Link className="off-ghost" aria-disabled={busy} tabIndex={busy ? -1 : undefined} onClick={(event) => { if (busy) event.preventDefault(); }} to={`/app/learn/chapters/${item.entityId}?downloaded=1`}>Read download</Link>}
									<button type="button" className="off-ghost" disabled={busy} onClick={() => void download(item.entityId, item.title)}>{item.status === 'failed' || item.status === 'downloading' ? 'Retry download' : 'Download again'}</button>
								</>}
								<button type="button" className="off-ghost" disabled={busy} onClick={() => void remove(item.id)}>Remove</button>
							</div>
						</li>
					))}
				</ul>
			)}
			<p className="off-note">Chapter downloads include text and equations. Interactive visuals and remote images may need a connection.</p>
		</div>
	)
}

/** Drop-in button for chapter and lesson headers. */
export const DownloadChapterButton = ({ chapterId, title }: { chapterId: string; title?: string }) => {
	const { packages, download, remove, message, busy, available } = useDownloads()
	if (!available) return null
	const existing = (packages ?? []).find((item) => item.id === `chapter:${chapterId}`)
	return (
		<span className="off-inline">
			{existing && existing.status !== 'failed' ? (
				<button type="button" className="off-ghost" disabled={busy} onClick={() => void remove(existing.id)}>
					Remove download ({formatBytes(existing.size)})
				</button>
			) : (
				<button type="button" className="off-ghost" disabled={busy} onClick={() => void download(chapterId, title)}>{busy ? 'Downloading…' : 'Download for offline'}</button>
			)}
			{message ? <span className="off-meta" role="status">{message}</span> : null}
		</span>
	)
}
