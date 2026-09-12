import { z } from 'zod';

import { getSupabase } from '@/lib/supabase';

import {
  CatalogSchema,
  ProfileSchema,
} from '@/types/student';

import type { OnboardingDraft } from '@/types/student';

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

    return CatalogSchema.parse(data);
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
