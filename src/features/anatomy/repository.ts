import { getSupabase } from '@/lib/supabase'
import { ANATOMY_SAMPLE, SUPPORTED_SYSTEMS, type AnatomyOrgan, type AnatomyProcess, type AnatomyStructure, type AnatomySystem, type AnatomyLayer } from './model'

type Row = Record<string, unknown>
type Builder = {
  select: (columns: string) => Builder
  order: (column: string, opts: { ascending: boolean }) => Builder
  limit: (count: number) => Promise<{ data: Row[] | null; error: { message: string; code?: string } | null }>
}
const client = () => getSupabase() as unknown as { from: (table: string) => Builder }

const str = (row: Row, keys: string[], fallback = ''): string => {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return fallback
}
const numberOf = (row: Row, keys: string[], fallback: number): number => {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return fallback
}

async function table(name: string): Promise<Row[] | null> {
  try {
    const { data, error } = await client().from(name).select('*').limit(2000)
    if (error) return null
    return data ?? []
  } catch {
    return null
  }
}

/** Reads published anatomy rows. If the tables are absent or empty, the
 *  bundled reference dataset is used so the explorer always works. */
export const anatomyRepository = {
  async listSystems(): Promise<{ systems: AnatomySystem[]; source: 'database' | 'bundled' }> {
    const [systemRows, organRows, structureRows, processRows] = await Promise.all([
      table('anatomy_systems'),
      table('anatomy_organs'),
      table('anatomy_structures'),
      table('anatomy_processes'),
    ])
    if (!systemRows || systemRows.length === 0) return { systems: ANATOMY_SAMPLE, source: 'bundled' }

    const structuresFor = (organId: string): AnatomyStructure[] =>
      (structureRows ?? [])
        .filter((row) => str(row, ['organ_id']) === organId)
        .map((row) => ({
          slug: str(row, ['slug']),
          name: str(row, ['name']),
          objectKey: str(row, ['object_key'], str(row, ['slug'])),
          location: str(row, ['location']),
          structure: str(row, ['structure']),
          function: str(row, ['function']),
          flowRole: str(row, ['flow_role']),
          layer: (str(row, ['layer'], 'organs') as AnatomyLayer),
          essential: row['essential'] !== false,
        }))

    const processesFor = (organId: string): AnatomyProcess[] =>
      (processRows ?? [])
        .filter((row) => str(row, ['organ_id']) === organId)
        .map((row) => {
          const steps = Array.isArray(row['steps']) ? (row['steps'] as Row[]) : []
          return {
            slug: str(row, ['slug']),
            name: str(row, ['name']),
            summary: str(row, ['summary']),
            stepDurationMs: numberOf(row, ['step_duration_ms'], 2600),
            steps: steps.map((step, index) => ({
              key: str(step, ['key'], `step-${index}`),
              title: str(step, ['title']),
              description: str(step, ['description']),
              highlight: Array.isArray(step['highlight'])
                ? (step['highlight'] as unknown[]).filter((item): item is string => typeof item === 'string')
                : [],
            })),
          }
        })

    const systems: AnatomySystem[] = systemRows.map((row) => {
      const id = str(row, ['id'])
      const organs: AnatomyOrgan[] = (organRows ?? [])
        .filter((organ) => str(organ, ['system_id']) === id)
        .map((organ) => {
          const organId = str(organ, ['id'])
          return {
            slug: str(organ, ['slug']),
            name: str(organ, ['name']),
            summary: str(organ, ['summary']),
            visualizationId: str(organ, ['visualization_id']) || undefined,
            structures: structuresFor(organId),
            processes: processesFor(organId),
          }
        })
      return { slug: str(row, ['slug']), name: str(row, ['name']), summary: str(row, ['summary']), organs }
    })
    return { systems, source: 'database' }
  },

  /** Every supported system, merged with whatever data exists. */
  async listSystemCatalog(): Promise<{ systems: AnatomySystem[]; source: 'database' | 'bundled' }> {
    const { systems, source } = await this.listSystems()
    const merged = SUPPORTED_SYSTEMS.map((supported) => {
      const found = systems.find((system) => system.slug === supported.slug)
      return found ?? { ...supported, organs: [] }
    })
    return { systems: merged, source }
  },
}
