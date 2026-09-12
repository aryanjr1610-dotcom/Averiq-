import { useCallback, useEffect, useState } from 'react'
import { asObject, check, db } from '../../lib/db-client'
import { useAuth } from '../auth/useAuth'
import { useAcademicTheme } from '@/app/providers/AcademicThemeProvider'
import type { UiStyle, VisualPreferences } from '@/types/academic-theme'

export type LearningStyle = 'detailed' | 'balanced' | 'visual' | 'practice'
export type ThemeMode = 'system' | 'dark' | 'light'
export type Atmosphere = 'full' | 'reduced' | 'minimal'
export type MotionMode = 'system' | 'reduced'
export type VisualQuality = 'auto' | 'low' | 'medium' | 'high'
export type Depth = 'concise' | 'standard' | 'deep'
export type UIStyle = UiStyle

export type Preferences = {
	learning: { style: LearningStyle; dailyTargetMinutes: number }
	appearance: { mode: ThemeMode; atmosphere: Atmosphere; visualQuality: VisualQuality; uiStyle: UIStyle; liveWeather: boolean }
	notifications: { studyReminder: boolean; plannerReminder: boolean; revisionReminder: boolean; achievements: boolean }
	ai: { depth: Depth; keepHistory: boolean }
	accessibility: { motion: MotionMode; largerText: boolean }
	privacy: { storeAiHistory: boolean }
}

export const DEFAULT_PREFERENCES: Preferences = {
	learning: { style: 'balanced', dailyTargetMinutes: 30 },
	appearance: { mode: 'system', atmosphere: 'full', visualQuality: 'auto', uiStyle: 'living-sky', liveWeather: false },
	notifications: { studyReminder: false, plannerReminder: false, revisionReminder: false, achievements: true },
	ai: { depth: 'standard', keepHistory: true },
	accessibility: { motion: 'system', largerText: false },
	privacy: { storeAiHistory: true },
}

export const VISUAL_QUALITY_KEY = 'averiq:visual-preferences:v1'

export function visualPreferencesFromSettings(prefs: Preferences): Partial<VisualPreferences> {
	return {
		mode: prefs.appearance.mode,
		motion: prefs.accessibility.motion === 'reduced' ? 'reduce' : 'system',
		decoration: prefs.appearance.atmosphere === 'minimal' ? 'off' : prefs.appearance.atmosphere === 'reduced' ? 'minimal' : 'standard',
		largerText: prefs.accessibility.largerText,
		uiStyle: prefs.appearance.uiStyle,
		liveWeather: prefs.appearance.liveWeather,
	}
}

const merge = <T extends object>(fallback: T, value: unknown): T => ({ ...fallback, ...(asObject(value) as Partial<T>) })

const fromRow = (row: Record<string, unknown> | null): Preferences =>
	row
		? {
				learning: merge(DEFAULT_PREFERENCES.learning, row.learning),
				appearance: merge(DEFAULT_PREFERENCES.appearance, row.appearance),
				notifications: merge(DEFAULT_PREFERENCES.notifications, row.notifications),
				ai: merge(DEFAULT_PREFERENCES.ai, row.ai),
				accessibility: merge(DEFAULT_PREFERENCES.accessibility, row.accessibility),
				privacy: merge(DEFAULT_PREFERENCES.privacy, row.privacy),
			}
		: DEFAULT_PREFERENCES

export const preferencesService = {
	async load(userId: string): Promise<Preferences> {
		const result = await db().from('user_preferences').select('*').eq('user_id', userId).maybeSingle()
		check(result.error, 'Could not load your settings')
		return fromRow(result.data)
	},

	async save(userId: string, next: Preferences): Promise<void> {
		const result = await db()
			.from('user_preferences')
			.upsert({ user_id: userId, ...next }, { onConflict: 'user_id' })
		check(result.error, 'Could not save your settings')
	},
}

/** Applies preferences that the rest of the app reads from the DOM/localStorage. */
export const applyPreferences = (prefs: Preferences): void => {
	const root = document.documentElement
	root.dataset.atmosphere = prefs.appearance.atmosphere
	root.dataset.uiStyle = prefs.appearance.uiStyle
	root.dataset.liveWeather = prefs.appearance.liveWeather ? 'true' : 'false'
	root.dataset.textScale = prefs.accessibility.largerText ? 'large' : 'normal'
	try {
		const raw = window.localStorage.getItem(VISUAL_QUALITY_KEY)
		const existing = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
		window.localStorage.setItem(
			VISUAL_QUALITY_KEY,
			JSON.stringify({
				...existing,
				quality: prefs.appearance.visualQuality,
				uiStyle: prefs.appearance.uiStyle,
				liveWeather: prefs.appearance.liveWeather,
			}),
		)
	} catch {
		/* storage unavailable */
	}
}

export const usePreferences = () => {
	const { user } = useAuth()
	const { updatePreferences } = useAcademicTheme()
	const userId = user?.id ?? null
	const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES)
	const [state, setState] = useState<'loading' | 'ready' | 'saving' | 'saved' | 'error'>('loading')

	useEffect(() => {
		if (!userId) return
		let active = true
		preferencesService
			.load(userId)
			.then((loaded) => {
				if (!active) return
				setPrefs(loaded)
				applyPreferences(loaded)
				updatePreferences(visualPreferencesFromSettings(loaded))
				setState('ready')
			})
			.catch(() => { if (active) setState('error') })
		return () => { active = false }
	}, [userId, updatePreferences])

	const update = useCallback(
		async <K extends keyof Preferences>(section: K, patch: Partial<Preferences[K]>) => {
			if (!userId) return
			const next: Preferences = { ...prefs, [section]: { ...prefs[section], ...patch } }
			setPrefs(next)
			applyPreferences(next)
			updatePreferences(visualPreferencesFromSettings(next))
			setState('saving')
			try {
				await preferencesService.save(userId, next)
				setState('saved')
			} catch {
				setState('error')
			}
		},
		[userId, prefs, updatePreferences],
	)

	return { prefs, update, state }
}
