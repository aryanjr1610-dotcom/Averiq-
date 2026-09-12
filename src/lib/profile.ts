import { getSupabase } from './supabase';

export interface Profile {
  userId: string;
  fullName: string | null;
  board: string | null;
  classLevel: number | null;
  stream: string | null;
}

export async function fetchProfile(): Promise<
  { ok: true; profile: Profile } | { ok: false; kind: 'auth' | 'schema' | 'network'; detail: string }
> {
  const { data: auth } = await getSupabase().auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { ok: false, kind: 'auth', detail: 'No session' };

  // Select explicit columns — handles both user_id and id with fallback
  let { data, error } = await getSupabase()
    .from('profiles')
    .select('user_id, display_name, board, class_level, stream')
    .eq('user_id', uid)
    .maybeSingle();

  if (error && (error.code === '42703' || /does not exist/i.test(error.message))) {
    // Fallback: table has 'id' column instead of 'user_id'
    const fallback = await getSupabase()
      .from('profiles')
      .select('id, display_name, board, class_level, stream')
      .eq('id', uid)
      .maybeSingle();

    if (!fallback.error) {
      error = null;
      data = fallback.data ? { ...fallback.data, user_id: fallback.data.id } : null;
    }
  }

  if (error) {
    const schemaDrift = error.code === '42703' || /does not exist/i.test(error.message);
    console.error('[averiq] profile fetch failed', error);
    return { ok: false, kind: schemaDrift ? 'schema' : 'network', detail: error.message };
  }

  // No row yet ≠ error. Onboarding just hasn't run.
  if (!data) {
    return { ok: true, profile: { userId: uid, fullName: null, board: null, classLevel: null, stream: null } };
  }

  const raw = data as Record<string, unknown>;
  return {
    ok: true,
    profile: {
      userId: String(raw.user_id ?? raw.id ?? uid),
      fullName: (raw.display_name ?? raw.full_name ?? null) as string | null,
      board: (raw.board ?? null) as string | null,
      classLevel: (raw.class_level ?? null) as number | null,
      stream: (raw.stream ?? null) as string | null,
    },
  };
}
