import { getSupabase } from '@/lib/supabase';

async function currentUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();
  if (error) throw error;
  if (!data.user?.id) throw new Error('Sign in to save study activity.');
  return data.user.id;
}

export type PracticeCorrectness = 'correct' | 'incorrect' | 'ungraded';

export const studyRepository = {
  async savePracticeAttempt(input: {
    exerciseId: string;
    lessonId?: string;
    topicId?: string;
    response: Record<string, unknown>;
    correctness: PracticeCorrectness;
    awardedMarks?: number | null;
    maxMarks?: number | null;
    durationSeconds?: number;
  }) {
    const userId = await currentUserId();
    const { error } = await getSupabase().from('practice_attempts').insert({
      user_id: userId,
      exercise_id: input.exerciseId,
      lesson_id: input.lessonId ?? null,
      topic_id: input.topicId ?? null,
      response: input.response,
      correctness: input.correctness,
      awarded_marks: input.awardedMarks ?? null,
      max_marks: input.maxMarks ?? null,
      duration_seconds: Math.max(0, Math.min(21_600, input.durationSeconds ?? 0)),
    });
    if (error) throw error;
  },

  async saveRevisionSession(input: {
    lessonId?: string;
    chapterId?: string;
    mode: 'quick' | 'detailed' | 'formula' | 'flashcards' | 'exam';
    confidence?: number | null;
    durationSeconds?: number;
  }) {
    const userId = await currentUserId();
    if (!input.lessonId && !input.chapterId) throw new Error('A lesson or chapter is required.');
    const { error } = await getSupabase().from('revision_sessions').insert({
      user_id: userId,
      lesson_id: input.lessonId ?? null,
      chapter_id: input.chapterId ?? null,
      mode: input.mode,
      confidence: input.confidence == null ? null : Math.max(1, Math.min(5, input.confidence)),
      duration_seconds: Math.max(0, Math.min(21_600, input.durationSeconds ?? 0)),
    });
    if (error) throw error;
  },

  async recentPracticeStats(days = 30) {
    const since = new Date(Date.now() - Math.max(1, days) * 86_400_000).toISOString();
    const { data, error } = await getSupabase()
      .from('practice_attempts')
      .select('correctness,attempted_at')
      .gte('attempted_at', since)
      .order('attempted_at', { ascending: false })
      .limit(1000);
    if (error) throw error;
    const graded = (data ?? []).filter((item) => item.correctness === 'correct' || item.correctness === 'incorrect');
    const correct = graded.filter((item) => item.correctness === 'correct').length;
    return {
      attempts: data?.length ?? 0,
      graded: graded.length,
      correct,
      accuracy: graded.length ? Math.round((correct / graded.length) * 100) : null,
    };
  },
};
