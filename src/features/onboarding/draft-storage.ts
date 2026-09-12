import type { User } from '@supabase/supabase-js';

import { DraftSchema } from '@/types/student';
import type { OnboardingDraft } from '@/types/student';

import { emptyDraft } from './rules';

const ttl = 24 * 60 * 60 * 1000;
const key = (userId: string) => `averiq:onboarding:v1:${userId}`;

function metadataString(user: User, names: string[]) {
  for (const name of names) {
    const value: unknown = user.user_metadata[name];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

export function initialDraft(user: User): OnboardingDraft {
  const name = metadataString(user, [
    'display_name',
    'full_name',
    'name',
  ]).slice(0, 80);

  const candidate = metadataString(user, ['avatar_url', 'picture']);
  let avatarUrl: string | null = null;

  try {
    if (candidate && new URL(candidate).protocol === 'https:') {
      avatarUrl = candidate;
    }
  } catch {
    avatarUrl = null;
  }

  return {
    ...emptyDraft,
    displayName: name,
    avatarUrl,
    selectedSubjects: [],
    competitiveGoals: [],
    studyGoals: [...emptyDraft.studyGoals],
  };
}

export function readDraft(
  user: User,
  catalogVersion: string,
): OnboardingDraft {
  try {
    const raw = sessionStorage.getItem(key(user.id));
    if (!raw) return initialDraft(user);

    const saved: unknown = JSON.parse(raw);

    if (
      typeof saved !== 'object' ||
      saved === null ||
      !('userId' in saved) ||
      saved.userId !== user.id ||
      !('catalogVersion' in saved) ||
      saved.catalogVersion !== catalogVersion ||
      !('expiresAt' in saved) ||
      typeof saved.expiresAt !== 'number' ||
      saved.expiresAt < Date.now() ||
      !('draft' in saved)
    ) {
      return initialDraft(user);
    }

    const result = DraftSchema.safeParse(saved.draft);
    return result.success ? result.data : initialDraft(user);
  } catch {
    return initialDraft(user);
  }
}

export function saveDraft(
  userId: string,
  catalogVersion: string,
  draft: OnboardingDraft,
) {
  try {
    sessionStorage.setItem(key(userId), JSON.stringify({
      userId,
      catalogVersion,
      expiresAt: Date.now() + ttl,
      draft,
    }));
  } catch {
    // The form remains usable if browser storage is unavailable.
  }
}

export function clearDraft(userId: string) {
  try {
    sessionStorage.removeItem(key(userId));
  } catch {
    // No server state is affected.
  }
}
