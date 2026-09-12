import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SearchResults, useGlobalSearch } from './GlobalSearch'
import './search.css'

export const SearchPage = () => {
	const navigate = useNavigate()
	const { query, setQuery, hits, degraded, busy } = useGlobalSearch()
	const [activeIndex, setActiveIndex] = useState(0)

	return (
		<div className="search-page">
			<header>
				<h1>Search</h1>
				<p className="search-note">Only published Averiq content and your own saved learning are searched.</p>
			</header>
			<input
				className="search-input"
				value={query}
				autoFocus
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
						navigate(hits[activeIndex].route)
					}
				}}
				aria-label="Search Averiq"
			/>
			<SearchResults
				hits={hits}
				query={query}
				degraded={degraded}
				busy={busy}
				activeIndex={activeIndex}
				onPick={(hit) => navigate(hit.route)}
			/>
			{query.trim().length >= 2 && !busy ? (
				<p className="search-note">
					Still not what you meant?{' '}
					<Link className="search-link" to={`/app/dashboard?ai=${encodeURIComponent(query.trim())}`}>
						Ask Averiq AI about “{query.trim()}”
					</Link>{' '}
					— nothing is sent until you open the tutor.
				</p>
			) : null}
		</div>
	)
}

export default SearchPage
