import { z } from 'zod';

import { getSupabase } from '@/lib/supabase';

import {
  CatalogSchema,
  ProfileSchema,
} from '@/types/student';

import type { OnboardingDraft } from '@/types/student';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function pathCopy(id: string): { label: string; description: string } {
  if (id.endsWith('-pcmb')) return { label: 'PCMB', description: 'Physics · Chemistry · Mathematics · Biology' };
  if (id.endsWith('-pcm')) return { label: 'PCM', description: 'Physics · Chemistry · Mathematics' };
  if (id.endsWith('-pcb')) return { label: 'PCB', description: 'Physics · Chemistry · Biology' };
  if (id.endsWith('-commerce-maths')) return { label: 'Commerce with Mathematics', description: 'Commerce pathway with Mathematics' };
  if (id.endsWith('-commerce')) return { label: 'Commerce', description: 'Commerce pathway without Mathematics' };
  if (id.endsWith('-humanities')) return { label: 'Humanities', description: 'Build a Humanities combination around your school subjects' };
  return {
    label: id.split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
    description: 'Academic pathway',
  };
}

/** Keep auth/onboarding usable even if a future catalogue is partially published. */
function normalizeCatalog(value: unknown): unknown {
  if (!isRecord(value) || !isRecord(value.config)) return value;

  const config = value.config;
  const paths = Array.isArray(config.paths) ? config.paths : [];
  const normalizedPaths = paths.map((entry) => {
    if (!isRecord(entry)) return entry;

    const id = typeof entry.id === 'string' ? entry.id : '';
    const copy = pathCopy(id);
    const required = strings(entry.required);
    const optional = strings(entry.optional);
    const existingDefaults = strings(entry.defaults);
    const minimum = typeof entry.minimum === 'number' && Number.isInteger(entry.minimum)
      ? Math.max(1, entry.minimum)
      : required.length;
    const fallbackDefaults = [...new Set([...required, ...optional])]
      .slice(0, Math.max(required.length, minimum));

    return {
      ...entry,
      stream: entry.stream === 'arts' ? 'humanities' : entry.stream,
      label: typeof entry.label === 'string' && entry.label.trim() ? entry.label : copy.label,
      description: typeof entry.description === 'string' && entry.description.trim() ? entry.description : copy.description,
      defaults: existingDefaults.length > 0 ? existingDefaults : fallbackDefaults,
    };
  });

  return { ...value, config: { ...config, paths: normalizedPaths } };
}

export const profileService = {
  async getProfile(userId: string) {
    const { data, error } = await getSupabase()
      .from('profiles')
      .select(`
        *,
        subjects:student_subjects(subject_key),
        competitive_goals:student_competitive_goals(goal_key,target_year)
      `)
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;

    return data === null ? null : ProfileSchema.parse(data);
  },

  async getCatalog() {
    const { data, error } = await getSupabase()
      .from('averiq_onboarding_catalogs')
      .select('version,academic_year,config')
      .eq('active', true)
      .single();

    if (error) throw error;

    return CatalogSchema.parse(normalizeCatalog(data));
  },

  async completeOnboarding(
    userId: string,
    catalogVersion: string,
    draft: OnboardingDraft,
  ) {
    const { data, error } = await getSupabase().rpc(
      'complete_onboarding',
      {
        p_user_id: userId,
        p_payload: {
          ...draft,
          displayName: draft.displayName.trim(),
          catalogVersion,
        },
      },
    );

    if (error) throw error;

    const savedUserId = z.string().uuid().parse(data);

    if (savedUserId !== userId) {
      throw new Error('Unexpected profile owner.');
    }
  },
};
