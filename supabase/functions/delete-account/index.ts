// Secure account deletion. Verifies the JWT, deletes owned rows, then the auth user.
// Service-role key stays server-side only.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OWNED_TABLES = [
	'note_tags', 'user_tags', 'user_bookmarks', 'user_highlights', 'user_notes',
	'user_achievements', 'user_xp', 'user_streaks', 'daily_activity', 'focus_sessions', 'study_tasks',
	'topic_mastery', 'activity_events', 'learning_sessions', 'lesson_progress',
	'ai_messages', 'ai_conversations',
	'student_competitive_goals', 'student_subjects',
	'profile_change_log', 'user_preferences', 'profiles',
]

const json = (body: unknown, status = 200): Response =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

// @ts-expect-error Deno global is present in Supabase Edge Functions environment
Deno.serve(async (request: Request) => {
	if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

	const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
	if (!token) return json({ error: 'Missing token' }, 401)

	let payload: { confirm?: string } = {}
	try {
		payload = await request.json()
	} catch {
		return json({ error: 'Invalid body' }, 400)
	}
	if (payload.confirm !== 'DELETE') return json({ error: 'Confirmation required' }, 400)

	// @ts-expect-error Deno global is present in Supabase Edge Functions environment
	const url = Deno.env.get('SUPABASE_URL') ?? ''
	// @ts-expect-error Deno global is present in Supabase Edge Functions environment
	const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
	if (!url || !serviceKey) return json({ error: 'Server not configured' }, 500)

	const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
	const { data: userData, error: userError } = await admin.auth.getUser(token)
	const userId = userData?.user?.id
	if (userError || !userId) return json({ error: 'Not authenticated' }, 401)

	const failures: string[] = []
	for (const table of OWNED_TABLES) {
		const { error } = await admin.from(table).delete().eq('user_id', userId)
		if (error && !/does not exist/i.test(error.message)) failures.push(`${table}: ${error.message}`)
	}

	await admin.storage.from('profile-media').remove([`${userId}/profile/avatar.webp`, `${userId}/profile/banner.webp`])

	if (failures.length > 0) return json({ error: 'Data deletion incomplete', details: failures }, 500)

	const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
	if (deleteError) return json({ error: deleteError.message }, 500)

	return json({ deleted: true })
})
