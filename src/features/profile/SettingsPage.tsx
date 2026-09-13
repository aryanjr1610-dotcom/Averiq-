import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppleSwitch } from '@/components/design/AppleSwitch'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '../auth/useAuth'
import { check, db } from '../../lib/db-client'
import { DownloadsPanel } from '../offline/DownloadsPanel'
import { usePreferences, type Atmosphere, type Depth, type LearningStyle, type MotionMode, type ThemeMode, type UIStyle, type VisualQuality } from './preferences'
import './profile.css'

const CATEGORIES = ['Account', 'Academic', 'Learning', 'Appearance', 'Notifications', 'AI', 'Accessibility', 'Privacy', 'Storage', 'About'] as const
type Category = (typeof CATEGORIES)[number]

const Choice = <T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ id: T; label: string }>; onChange: (next: T) => void }) => (
	<div className="set-field">
		<span className="set-label">{label}</span>
		<div className="set-chips" role="group" aria-label={label}>
			{options.map((option) => (
				<button key={option.id} type="button" aria-pressed={value === option.id} className={`set-chip${value === option.id ? ' set-chip--on' : ''}`} onClick={() => onChange(option.id)}>
					{option.label}
				</button>
			))}
		</div>
	</div>
)

const Toggle = ({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (next: boolean) => void }) => (
	<AppleSwitch
		checked={checked}
		onCheckedChange={onChange}
		label={label}
		description={hint}
		labelSide="left"
		tone="accent"
	/>
)

function AccountChange({ kind, onSaved }: { kind: 'email' | 'password'; onSaved: (message: string) => void }) {
	const [open, setOpen] = useState(false)
	const [value, setValue] = useState('')
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const title = kind === 'email' ? 'Change email' : 'Change password'
	const close = (next: boolean) => { setOpen(next); if (!next) { setValue(''); setError(null) } }
	const submit = async () => {
		if (saving) return
		setSaving(true)
		setError(null)
		try {
			const result = await db().auth.updateUser(kind === 'email' ? { email: value.trim() } : { password: value })
			if (result.error) throw result.error
			onSaved(kind === 'email' ? 'Check your new inbox to confirm the change.' : 'Password updated.')
			close(false)
		} catch {
			setError('Your ' + kind + ' could not be updated. Check your connection and try again. You may need to sign in again.')
		} finally { setSaving(false) }
	}
	return <Dialog open={open} onOpenChange={close} dismissible={!saving} title={title}
		description={kind === 'email' ? 'We’ll send a confirmation to your new address.' : 'Choose a password with at least 8 characters.'}
		trigger={<button type="button" className="pf-ghost">{title}</button>}>
		<form className="set-account-form" onSubmit={(event) => { event.preventDefault(); void submit() }}>
			<Input label={kind === 'email' ? 'New email address' : 'New password'} type={kind} value={value} onChange={(event) => setValue(event.target.value)}
				autoComplete={kind === 'email' ? 'email' : 'new-password'} minLength={kind === 'password' ? 8 : undefined} required disabled={saving} error={error ?? undefined} />
			<div className="actions"><Button type="submit" loading={saving}>Save {kind}</Button><Button variant="quiet" disabled={saving} onClick={() => close(false)}>Cancel</Button></div>
		</form>
	</Dialog>
}

export const SettingsPage = () => {
	const { user, session, signOut } = useAuth()
	const { prefs, update, state } = usePreferences()
	const [tab, setTab] = useState<Category>('Account')
	const [message, setMessage] = useState<string | null>(null)
	const [confirmText, setConfirmText] = useState('')
	const target = useMemo(() => prefs.learning.dailyTargetMinutes, [prefs.learning.dailyTargetMinutes])

	const clearAiHistory = async () => {
		try {
			const result = await db().from('ai_conversations').delete().eq('user_id', user?.id ?? '')
			check(result.error, 'Could not clear AI history')
			setMessage('AI chat history deleted.')
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Deletion failed — nothing was removed.')
		}
	}

	const signOutCurrentDevice = async () => {
		try {
			await signOut()
			setMessage('Signed out of this device.')
		} catch {
			setMessage('Sign out could not be completed. Refresh the page and try again.')
		}
	}

	const deleteAccount = async () => {
		if (confirmText !== 'DELETE') return

		const accessToken = session?.access_token
		if (!accessToken) {
			setMessage('Your session has expired. Sign in again before deleting your account.')
			return
		}

		try {
			const result = await db().functions.invoke('delete-account', {
				body: { confirm: 'DELETE' },
				headers: { Authorization: `Bearer ${accessToken}` },
			})

			if (result.error) {
				setMessage(`Deletion failed: ${result.error.message}`)
				return
			}

			setMessage('Account deleted. Signing you out…')

			// The account no longer exists server-side. A local sign-out may therefore
			// be rejected by Auth, so it is deliberately best-effort before redirect.
			try { await signOut() } catch { /* deleted account: nothing else to revoke */ }
			window.location.replace('/login')
		} catch (error) {
			setMessage(error instanceof Error ? `Deletion failed: ${error.message}` : 'Deletion failed. Nothing was removed.')
		}
	}

	return (
		<div className="set">
			<header>
				<h1>Settings</h1>
				<p className="pf-note set-save-status" role="status">{state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : state === 'error' ? 'Some settings could not be saved.' : 'Make Averiq feel right for you.'}</p>
			</header>

			<nav className="set-tabs" aria-label="Settings categories">
				{CATEGORIES.map((item) => (
					<button key={item} type="button" className={`set-tab${tab === item ? ' set-tab--on' : ''}`} aria-current={tab === item} onClick={() => setTab(item)}>
						{item}
					</button>
				))}
			</nav>

			<section className="set-panel" aria-labelledby="settings-section-title">
				<h2 id="settings-section-title">{tab}</h2>
				{tab === 'Account' ? (
					<>
						<p className="pf-note">Signed in as {user?.email}</p>
						<div className="pf-row">
							<AccountChange kind="email" onSaved={setMessage} />
							<AccountChange kind="password" onSaved={setMessage} />
							<button type="button" className="pf-ghost" onClick={() => void signOutCurrentDevice()}>Sign out</button>
						</div>
						<h3>Delete account</h3>
						<p className="pf-note">This permanently removes your profile, notes, progress and account. Type DELETE to confirm.</p>
						<div className="pf-row">
							<input value={confirmText} onChange={(event) => setConfirmText(event.target.value)} aria-label="Type DELETE to confirm" placeholder="DELETE" />
							<button type="button" className="pf-danger" disabled={confirmText !== 'DELETE'} onClick={() => void deleteAccount()}>Delete my account</button>
						</div>
					</>
				) : null}

				{tab === 'Academic' ? (
					<>
						<p className="pf-note">
							Changing your class or board changes the curriculum shown in Averiq. Your historical learning activity stays preserved.
						</p>
						<Link className="pf-primary pf-primary--link" to="/onboarding?mode=edit">Update class, board, stream and subjects</Link>
						<p className="pf-note">Competitive goals are validated against eligibility rules, so incompatible combinations are rejected.</p>
					</>
				) : null}

				{tab === 'Learning' ? (
					<>
						<Choice<LearningStyle>
							label="Learning emphasis"
							value={prefs.learning.style}
							options={[
								{ id: 'detailed', label: 'Detailed explanations' },
								{ id: 'balanced', label: 'Balanced' },
								{ id: 'visual', label: 'Visual emphasis' },
								{ id: 'practice', label: 'Practice emphasis' },
							]}
							onChange={(style) => void update('learning', { style })}
						/>
						<div className="set-field">
							<span className="set-label">Daily study target</span>
							<div className="set-chips">
								{[15, 30, 45, 60].map((minutes) => (
									<button key={minutes} type="button" aria-pressed={target === minutes} className={`set-chip${target === minutes ? ' set-chip--on' : ''}`} onClick={() => void update('learning', { dailyTargetMinutes: minutes })}>
										{minutes}m
									</button>
								))}
								<input
									type="number"
									min={5}
									max={480}
									value={target}
									aria-label="Custom daily target in minutes"
									onChange={(event) => {
										const parsed = Number.parseInt(event.target.value, 10)
										if (Number.isFinite(parsed)) void update('learning', { dailyTargetMinutes: Math.min(480, Math.max(5, parsed)) })
									}}
								/>
							</div>
						</div>
						<p className="pf-note">A target is a guide, not a rule. Every learning feature stays available whatever you pick.</p>
					</>
				) : null}

				{tab === 'Appearance' ? (
					<>
						<Choice<UIStyle>
							label="Interface style"
							value={prefs.appearance.uiStyle}
							options={[
								{ id: 'living-sky', label: 'Living Nature' },
								{ id: 'academic', label: 'Academic' },
							]}
							onChange={(uiStyle) => void update('appearance', { uiStyle })}
						/>
						<p className="pf-note">Living Nature changes continuously with local time. Dawn, daylight, golden hour, evening, moonlight and stars blend naturally through the day.</p>
						{prefs.appearance.uiStyle === 'living-sky' ? (
							<>
								<Toggle
									label="Use local weather and sunrise/sunset"
									hint="When enabled, your browser asks for location permission. Averiq refreshes conditions every 20 minutes and never stores your coordinates."
									checked={prefs.appearance.liveWeather}
									onChange={(liveWeather) => void update('appearance', { liveWeather })}
								/>
								<Toggle
									label="Show gentle weather tips"
									hint="Adds a short, non-blocking study suggestion when live weather is available."
									checked={prefs.appearance.weatherTips}
									onChange={(weatherTips) => void update('appearance', { weatherTips })}
								/>
							</>
						) : null}
						<Choice<ThemeMode> label="Theme" value={prefs.appearance.mode} options={[{ id: 'system', label: 'System' }, { id: 'dark', label: 'Dark' }, { id: 'light', label: 'Light' }]} onChange={(mode) => void update('appearance', { mode })} />
						<Choice<Atmosphere> label="Atmosphere detail" value={prefs.appearance.atmosphere} options={[{ id: 'full', label: 'Full' }, { id: 'reduced', label: 'Reduced' }, { id: 'minimal', label: 'Minimal' }]} onChange={(atmosphere) => void update('appearance', { atmosphere })} />
						<Choice<VisualQuality> label="Visual quality (2D/3D)" value={prefs.appearance.visualQuality} options={[{ id: 'auto', label: 'Auto' }, { id: 'low', label: 'Low' }, { id: 'medium', label: 'Medium' }, { id: 'high', label: 'High' }]} onChange={(visualQuality) => void update('appearance', { visualQuality })} />
					</>
				) : null}

				{tab === 'Notifications' ? (
					<>
						<p className="pf-note">Averiq has no push server yet, so these choices are stored for in-app reminders only.</p>
						<Toggle label="Study reminders" checked={prefs.notifications.studyReminder} onChange={(studyReminder) => void update('notifications', { studyReminder })} />
						<Toggle label="Planner reminders" checked={prefs.notifications.plannerReminder} onChange={(plannerReminder) => void update('notifications', { plannerReminder })} />
						<Toggle label="Revision reminders" checked={prefs.notifications.revisionReminder} onChange={(revisionReminder) => void update('notifications', { revisionReminder })} />
						<Toggle label="Achievement messages" checked={prefs.notifications.achievements} onChange={(achievements) => void update('notifications', { achievements })} />
					</>
				) : null}

				{tab === 'AI' ? (
					<>
						<Choice<Depth> label="Default explanation depth" value={prefs.ai.depth} options={[{ id: 'concise', label: 'Concise' }, { id: 'standard', label: 'Standard' }, { id: 'deep', label: 'Deep' }]} onChange={(depth) => void update('ai', { depth })} />
						<Toggle label="Keep my AI conversations" hint="Turn off to stop storing new chats" checked={prefs.ai.keepHistory} onChange={(keepHistory) => void update('ai', { keepHistory })} />
						<p className="pf-note">Averiq AI is unavailable during exam-mode practice by design.</p>
					</>
				) : null}

				{tab === 'Accessibility' ? (
					<>
						<Choice<MotionMode> label="Motion" value={prefs.accessibility.motion} options={[{ id: 'system', label: 'System preference' }, { id: 'reduced', label: 'Reduced motion' }]} onChange={(motion) => void update('accessibility', { motion })} />
						<Toggle label="Larger reading text" checked={prefs.accessibility.largerText} onChange={(largerText) => void update('accessibility', { largerText })} />
					</>
				) : null}

				{tab === 'Privacy' ? (
					<>
						<Toggle label="Store AI chat history" checked={prefs.privacy.storeAiHistory} onChange={(storeAiHistory) => void update('privacy', { storeAiHistory })} />
						<div className="pf-row">
							<button type="button" className="pf-ghost" onClick={() => void clearAiHistory()}>Delete AI chat history</button>
							<Link className="pf-ghost" to="/app/notes">Manage personal notes</Link>
							<Link className="pf-ghost" to="/app/progress">Review learning history</Link>
						</div>
						<p className="pf-note">Notes, highlights, progress and AI chats are private to your account and protected by row-level security.</p>
					</>
				) : null}

				{tab === 'Storage' ? <DownloadsPanel /> : null}

				{tab === 'About' ? (
					<p className="pf-note">
						Averiq — Learn beyond the page. Content is board-aligned and reviewed before publishing; drafts are never shown to students.
					</p>
				) : null}
			</section>

			{message ? <p className="pf-note" role="status">{message}</p> : null}
		</div>
	)
}

export default SettingsPage