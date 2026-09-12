import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { asNullText, asObject, check, db } from '../../lib/db-client'
import { gamificationRepository } from '../gamification/repository'
import { progressRepository } from '../progress/repository'
import { initials, profileMedia, type MediaKind } from './media'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Button } from '@/components/ui/Button'
import './profile.css'

type ProfileRow = {
	displayName: string | null
	bio: string | null
	avatarUrl: string | null
	bannerUrl: string | null
	board: string | null
	classLevel: string | null
	stream: string | null
	combination: string | null
	createdAt: string | null
	raw: Record<string, unknown>
}

const pick = (row: Record<string, unknown>, keys: string[]): string | null => {
	for (const key of keys) {
		const value = row[key]
		if (typeof value === 'string' && value.trim()) return value
		if (typeof value === 'number') return String(value)
	}
	return null
}

export const ProfilePage = () => {
	const navigate = useNavigate()
	const { user } = useAuth()
	const userId = user?.id ?? null
	const [profile, setProfile] = useState<ProfileRow | null>(null)
	const [stats, setStats] = useState<{ streak: number; xp: number; level: number; achievements: string[]; lessons: number; studyMinutes: number } | null>(null)
	const [editing, setEditing] = useState(false)
	const [name, setName] = useState('')
	const [bio, setBio] = useState('')
	const [message, setMessage] = useState<string | null>(null)
	const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
	const avatarInput = useRef<HTMLInputElement | null>(null)
	const bannerInput = useRef<HTMLInputElement | null>(null)

	const load = useCallback(async () => {
		if (!userId) return
		setStatus('loading')
		try {
			let result = await db().from('profiles').select('*').eq('user_id', userId).maybeSingle()
			if (result.error && (result.error.code === '42703' || /does not exist/i.test(result.error.message))) {
				result = await db().from('profiles').select('*').eq('id', userId).maybeSingle()
			}
			check(result.error, 'Could not load your profile')
			const row = asObject(result.data)
			const parsed: ProfileRow = {
				displayName: pick(row, ['display_name', 'full_name', 'name']),
				bio: asNullText(row.bio),
				avatarUrl: asNullText(row.avatar_url),
				bannerUrl: asNullText(row.banner_url),
				board: pick(row, ['board_key', 'board']),
				classLevel: pick(row, ['class_level', 'grade', 'class']),
				stream: pick(row, ['stream_key', 'stream']),
				combination: pick(row, ['combination_key', 'subject_combination']),
				createdAt: asNullText(row.created_at),
				raw: row,
			}
			setProfile(parsed)
			setName(parsed.displayName ?? '')
			setBio(parsed.bio ?? '')

			const [game, lessons, trend] = await Promise.all([
				gamificationRepository.summary(userId),
				progressRepository.recentLessons(20).catch(() => []),
				progressRepository.studyTrend(30).catch(() => [] as Array<{ seconds: number }>),
			])
			setStats({
				streak: game.streak.current,
				xp: game.totalXp,
				level: game.level,
				achievements: game.unlocked,
				lessons: Array.isArray(lessons) ? lessons.filter((item) => item.status === 'completed').length : 0,
				studyMinutes: Math.round(trend.reduce((sum, day) => sum + (day.seconds ?? 0), 0) / 60),
			})
			setStatus('ready')
		} catch (error) {
			setStatus('error')
			setMessage(error instanceof Error ? error.message : 'Could not load your profile.')
		}
	}, [userId])

	useEffect(() => {
		void load()
	}, [load])

	const saveBasics = async () => {
		if (!userId || !profile) return
		try {
			const column = 'display_name' in profile.raw ? 'display_name' : 'full_name' in profile.raw ? 'full_name' : 'name'
			let result = await db().from('profiles').update({ [column]: name.trim() || null, bio: bio.trim() || null }).eq('user_id', userId)
			if (result.error && (result.error.code === '42703' || /does not exist/i.test(result.error.message))) {
				result = await db().from('profiles').update({ [column]: name.trim() || null, bio: bio.trim() || null }).eq('id', userId)
			}
			check(result.error, 'Could not save your profile')
			setProfile({ ...profile, displayName: name.trim() || null, bio: bio.trim() || null })
			setEditing(false)
			setMessage('Profile updated.')
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not save your profile.')
		}
	}

	const uploadMedia = async (kind: MediaKind, file: File | undefined) => {
		if (!userId || !file || !profile) return
		try {
			const url = await profileMedia.upload(userId, kind, file)
			setProfile({ ...profile, ...(kind === 'avatar' ? { avatarUrl: url } : { bannerUrl: url }) })
			setMessage(kind === 'avatar' ? 'Avatar updated.' : 'Banner updated.')
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Upload failed.')
		}
	}

	const removeMedia = async (kind: MediaKind) => {
		if (!userId || !profile) return
		try {
			await profileMedia.remove(userId, kind)
			setProfile({ ...profile, ...(kind === 'avatar' ? { avatarUrl: null } : { bannerUrl: null }) })
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not remove the image.')
		}
	}

	if (!userId) return <p className="pf-note">Sign in to view your profile.</p>
	if (status === 'loading') return <p className="pf-note">Loading your profile…</p>
	if (status === 'error') {
		return (
			<ErrorState
				kind="server"
				detail={message ?? undefined}
				onRetry={() => void load()}
				fallbackAction={{ label: "Open settings", onClick: () => navigate("/app/settings") }}
			/>
		)
	}

	const context = [profile?.board, profile?.classLevel ? `Class ${profile.classLevel}` : null, profile?.combination ?? profile?.stream]
		.filter(Boolean)
		.join(' • ')

	return (
		<div className="pf">
			<div className="pf-banner" style={profile?.bannerUrl ? { backgroundImage: `url(${profile.bannerUrl})` } : undefined}>
				<div className="pf-banner__actions">
					<Button variant="ghost" size="sm" onClick={() => bannerInput.current?.click()}>
						{profile?.bannerUrl ? 'Replace banner' : 'Add banner'}
					</Button>
					{profile?.bannerUrl ? (
						<Button variant="ghost" size="sm" onClick={() => void removeMedia('banner')}>
							Remove
						</Button>
					) : null}
				</div>
			</div>

			<header className="pf-head">
				<div className="pf-avatar">
					{profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <span>{initials(profile?.displayName ?? user?.email)}</span>}
				</div>
				<div className="pf-identity">
					{editing ? (
						<div className="pf-edit">
							<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Display name" aria-label="Display name" />
							<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={400} rows={3} placeholder="A short bio" aria-label="Bio" />
							<div className="pf-row">
								<Button variant="primary" size="md" onClick={() => void saveBasics()}>Save</Button>
								<Button variant="ghost" size="md" onClick={() => setEditing(false)}>Cancel</Button>
								<Button variant="ghost" size="md" onClick={() => avatarInput.current?.click()}>Change avatar</Button>
								{profile?.avatarUrl ? <Button variant="ghost" size="md" onClick={() => void removeMedia('avatar')}>Remove avatar</Button> : null}
							</div>
						</div>
					) : (
						<>
							<h1>{profile?.displayName ?? 'Your profile'}</h1>
							{context ? <p className="pf-context">{context}</p> : <p className="pf-note">Academic context not set yet.</p>}
							{profile?.bio ? <p className="pf-bio">{profile.bio}</p> : null}
							<div className="pf-row">
								<Button variant="primary" size="md" className="aq-btn aq-btn--primary" onClick={() => setEditing(true)}>Edit profile</Button>
								<Link className="pf-ghost" to="/app/settings">Settings</Link>
							</div>
						</>
					)}
				</div>
			</header>

			<input ref={avatarInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => void uploadMedia('avatar', event.target.files?.[0])} />
			<input ref={bannerInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => void uploadMedia('banner', event.target.files?.[0])} />

			{message ? <p className="pf-note" role="status">{message}</p> : null}

			<section className="pf-block">
				<h2>Your activity</h2>
				{stats ? (
					<ul className="pf-stats">
						<li><strong>{stats.streak}</strong><span>day streak</span></li>
						<li><strong>{stats.lessons}</strong><span>lessons completed</span></li>
						<li><strong>{stats.studyMinutes}</strong><span>minutes in 30 days</span></li>
						<li><strong>{stats.xp}</strong><span>XP · level {stats.level}</span></li>
					</ul>
				) : (
					<p className="pf-note">Activity appears once you start studying.</p>
				)}
			</section>

			<section className="pf-block">
				<h2>Achievements</h2>
				{stats && stats.achievements.length > 0 ? (
					<ul className="pf-badges">
						{gamificationRepository.definitions
							.filter((item) => stats.achievements.includes(item.key))
							.map((item) => (
								<li key={item.key}>
									<strong>{item.title}</strong>
									<span>{item.description}</span>
								</li>
							))}
					</ul>
				) : (
					<p className="pf-note">No achievements unlocked yet.</p>
				)}
			</section>
		</div>
	)
}

export default ProfilePage
