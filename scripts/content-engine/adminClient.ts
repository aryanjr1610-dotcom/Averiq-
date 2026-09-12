import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({
  path: '.env.content',
})

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL is missing from .env.content')
}
if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing from .env.content')
}

/**
 * SERVER / LOCAL SCRIPT ONLY.
 *
 * Never import this file into:
 * - React components
 * - src/
 * - browser code
 * - Vite client code
 */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})
