import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { GROUP_LABEL, groupHits, runSearch, type SearchHit } from './search-service'
import './search.css'

export const useGlobalSearch = (initial = '') => {
	const { user } = useAuth()
	const userId = user?.id ?? null
	const [query, setQuery] = useState(initial)
	const [hits, setHits] = useState<SearchHit[]>([])
	const [degraded, setDegraded] = useState<string[]>([])
	const [busy, setBusy] = useState(false)
	const timer = useRef<number | null>(null)

	useEffect(() => {
		let active = true
		if (timer.current) window.clearTimeout(timer.current)
		setHits([])
		setDegraded([])
		if (query.trim().length < 2) {
			setBusy(false)
			return undefined
		}
		setBusy(true)
		timer.current = window.setTimeout(() => {
			runSearch(query, userId)
				.then((outcome) => {
					if (!active) return
					setHits(groupHits(outcome.hits).flatMap((group) => group.items))
					setDegraded(outcome.degraded)
				})
				.catch(() => { if (active) setDegraded(['Search is unavailable right now. Try again in a moment.']) })
				.finally(() => { if (active) setBusy(false) })
		}, 250)
		return () => {
			active = false
			if (timer.current) window.clearTimeout(timer.current)
		}
	}, [query, userId])

	return { query, setQuery, hits, degraded, busy }
}

export const SearchResults = ({
	hits,
	query,
	degraded,
	busy,
	activeIndex,
	onPick,
}: {
	hits: SearchHit[]
	query: string
	degraded: string[]
	busy: boolean
	activeIndex: number
	onPick: (hit: SearchHit) => void
}) => {
	const groups = useMemo(() => groupHits(hits), [hits])
	const resultsRef = useRef<HTMLDivElement>(null)
	useEffect(() => {
		resultsRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
	}, [activeIndex])
	let index = -1

	return (
		<div ref={resultsRef} className="search-results" aria-busy={busy}>
			<span className="sr-only" role="status">{hits[activeIndex] ? `Selected result: ${hits[activeIndex].title}` : ''}</span>
			{degraded.map((line) => (
				<p key={line} className="search-note search-note--warn">
					{line}
				</p>
			))}
			{busy ? <p className="search-note" role="status">Searching…</p> : null}
			{!busy && query.trim().length >= 2 && hits.length === 0 ? (
				<p className="search-note">
					Nothing matched “{query.trim()}”. Try a chapter name, a formula name or a topic.
				</p>
			) : null}
			{groups.map((group) => (
				<section key={group.key} className="search-group">
					<h3 className="search-group__title">{GROUP_LABEL[group.key]}</h3>
					<ul className="search-list">
						{group.items.map((hit) => {
							index += 1
							const current = index
							return (
								<li key={hit.id}>
									<button
										type="button"
										aria-current={current === activeIndex ? "true" : undefined}
										className={`search-hit${current === activeIndex ? ' search-hit--on' : ''}`}
										onClick={() => onPick(hit)}
									>
										<span className="search-hit__title">{hit.title}</span>
										{hit.subtitle ? <span className="search-hit__meta">{hit.subtitle}</span> : null}
									</button>
								</li>
							)
						})}
					</ul>
				</section>
			))}
		</div>
	)
}

/** Cmd/Ctrl+K overlay. Mount once in AppShell. */
export const GlobalSearchOverlay = () => {
	const navigate = useNavigate()
	const [open, setOpen] = useState(false)
	const [activeIndex, setActiveIndex] = useState(0)
	const { query, setQuery, hits, degraded, busy } = useGlobalSearch()
	const inputRef = useRef<HTMLInputElement | null>(null)
	const returnFocus = useRef<HTMLElement | null>(null)

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault()
				if (document.activeElement instanceof HTMLElement && !document.activeElement.closest('[role="dialog"]')) returnFocus.current = document.activeElement
				setOpen((value) => !value)
			}
			if (event.key === 'Escape') setOpen(false)
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [])

	useEffect(() => {
		if (open) inputRef.current?.focus()
		else setActiveIndex(0)
	}, [open])

	const pick = useCallback(
		(hit: SearchHit) => {
			setOpen(false)
			navigate(hit.route)
		},
		[navigate],
	)

	if (!open) return null

	return (
		<DialogPrimitive.Root open={open} onOpenChange={setOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="search-overlay" />
            <DialogPrimitive.Content className="search-panel" aria-describedby={undefined} onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus.current?.focus() }}>
              <DialogPrimitive.Title className="sr-only">Search Averiq</DialogPrimitive.Title>
				<input
					ref={inputRef}
					className="search-input"
					aria-label="Search Averiq"
					value={query}
					placeholder="Search lessons, formulae, questions, notes…"
					onChange={(event) => {
						setQuery(event.target.value)
						setActiveIndex(0)
					}}
					onKeyDown={(event) => {
						if (event.key === 'ArrowDown') {
							event.preventDefault()
							setActiveIndex((value) => Math.max(0, Math.min(hits.length - 1, value + 1)))
						} else if (event.key === 'ArrowUp') {
							event.preventDefault()
							setActiveIndex((value) => Math.max(0, value - 1))
						} else if (event.key === 'Enter' && hits[activeIndex]) {
							pick(hits[activeIndex])
						}
					}}
				/>
				<SearchResults hits={hits} query={query} degraded={degraded} busy={busy} activeIndex={activeIndex} onPick={pick} />
				<button type="button" className="search-close" onClick={() => setOpen(false)}>
					Close
				</button>
			</DialogPrimitive.Content>
          </DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	)
}

export default GlobalSearchOverlay
