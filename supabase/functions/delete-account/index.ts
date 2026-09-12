// Secure account deletion. JWT is verified again in-function; the service-role key stays server-side only.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PROFILE_MEDIA_BUCKET = 'profile-media'
const LIST_PAGE_SIZE = 100

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  })

type AdminClient = ReturnType<typeof createClient>

async function collectOwnedFiles(admin: AdminClient, prefix: string): Promise<string[]> {
  const files: string[] = []
  let offset = 0

  while (true) {
    const { data, error } = await admin.storage
      .from(PROFILE_MEDIA_BUCKET)
      .list(prefix, { limit: LIST_PAGE_SIZE, offset, sortBy: { column: 'name', order: 'asc' } })

    if (error) throw error
    const rows = data ?? []

    for (const item of rows) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id) {
        files.push(path)
      } else {
        files.push(...await collectOwnedFiles(admin, path))
      }
    }

    if (rows.length < LIST_PAGE_SIZE) break
    offset += LIST_PAGE_SIZE
  }

  return files
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
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

  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!url || !serviceKey) return json({ error: 'Server not configured' }, 500)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  const userId = userData?.user?.id
  if (userError || !userId) return json({ error: 'Not authenticated' }, 401)

  // Supabase can reject Auth-user deletion while the user still owns Storage objects.
  // Profile media is namespaced by user id, so remove every file in that namespace first.
  try {
    const mediaFiles = await collectOwnedFiles(admin, userId)
    if (mediaFiles.length > 0) {
      const { error: removeError } = await admin.storage.from(PROFILE_MEDIA_BUCKET).remove(mediaFiles)
      if (removeError) throw removeError
    }
  } catch (error) {
    console.error('profile media deletion failed', error)
    return json({ error: 'Could not remove account media. Nothing else was deleted.' }, 500)
  }

  // Public user-owned rows use ON DELETE CASCADE from auth.users, so the database remains
  // the authoritative deletion graph as new user-owned tables are added in future migrations.
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
  if (deleteError) {
    console.error('auth user deletion failed', deleteError.message)
    return json({ error: 'Account deletion could not be completed.' }, 500)
  }

  return json({ deleted: true })
})
