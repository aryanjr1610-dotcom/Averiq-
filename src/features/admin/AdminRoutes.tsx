import { lazy, Suspense } from 'react'
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useRoles } from './roles'
import './admin.css'

const AdminHome = lazy(() => import('./AdminPages').then((m) => ({ default: m.AdminHome })))
const CurriculumManager = lazy(() => import('./AdminPages').then((m) => ({ default: m.CurriculumManager })))
const CompletenessPage = lazy(() => import('./AdminPages').then((m) => ({ default: m.CompletenessPage })))
const ReviewPage = lazy(() => import('./AdminPages').then((m) => ({ default: m.ReviewPage })))
const ContentEditorPage = lazy(() => import('./ContentEditorPage'))
const ImportPage = lazy(() => import('./ImportPage'))

const NAV = [
	{ to: '/admin', label: 'Overview' },
	{ to: '/admin/curriculum', label: 'Curriculum' },
	{ to: '/admin/content', label: 'Content' },
	{ to: '/admin/import', label: 'Import' },
	{ to: '/admin/completeness', label: 'Completeness' },
	{ to: '/admin/review', label: 'Review' },
]

export const AdminRoutes = () => {
	const { loading, canEdit, canReview } = useRoles()

	if (loading) return <p className="adm-note">Checking your access…</p>
	if (!canEdit && !canReview) {
		return (
			<div className="adm">
				<h1>Averiq CMS</h1>
				<p className="adm-note">
					Your account does not have content permissions. Row-level security also blocks CMS writes, so this is not a UI-only check.
				</p>
				<Link className="adm-ghost" to="/app/dashboard">Back to Averiq</Link>
			</div>
		)
	}

	return (
		<div className="adm">
			<nav className="adm-nav" aria-label="CMS sections">
				{NAV.map((item) => (
					<NavLink key={item.to} to={item.to} end={item.to === '/admin'} className="adm-nav__link">
						{item.label}
					</NavLink>
				))}
				<Link to="/app/dashboard" className="adm-ghost">Exit CMS</Link>
			</nav>
			<Suspense fallback={<p className="adm-note">Loading…</p>}>
				<Routes>
					<Route index element={<AdminHome />} />
					<Route path="curriculum" element={<CurriculumManager />} />
					<Route path="content" element={<ContentEditorPage />} />
					<Route path="content/:lessonId" element={<ContentEditorPage />} />
					<Route path="import" element={<ImportPage />} />
					<Route path="completeness" element={<CompletenessPage />} />
					<Route path="review" element={<ReviewPage />} />
					<Route path="*" element={<Navigate to="/admin" replace />} />
				</Routes>
			</Suspense>
		</div>
	)
}

export default AdminRoutes
