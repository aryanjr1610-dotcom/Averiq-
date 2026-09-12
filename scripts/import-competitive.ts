// Usage:
//   node --env-file=../averiq-admin.env --import tsx scripts/import-competitive.ts scripts/competitive-sample.json
// The JSON carries the real column names, so this script makes no schema assumptions.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

type TableBatch = { table: string; conflict?: string; rows: Array<Record<string, unknown>> }
type Bundle = { formatVersion: 1; label: string; tables: TableBatch[] }

const [, , file] = process.argv
if (!file) throw new Error('Pass the bundle path, e.g. scripts/competitive-sample.json')

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (server-only env file).')

const bundle = JSON.parse(readFileSync(file, 'utf8')) as Bundle
if (bundle.formatVersion !== 1) throw new Error('Unsupported formatVersion')

const admin = createClient(url, key, { auth: { persistSession: false } })

const run = async () => {
  for (const batch of bundle.tables) {
    if (batch.rows.length === 0) continue
    const query = admin.from(batch.table)
    const { error } = batch.conflict
      ? await query.upsert(batch.rows, { onConflict: batch.conflict })
      : await query.insert(batch.rows)
    if (error) throw new Error(`${batch.table}: ${error.message}`)
    console.log(`${batch.table}: ${batch.rows.length} row(s)`)
  }
  console.log(`Imported bundle "${bundle.label}". Nothing was published — cycles stay in draft.`)
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
