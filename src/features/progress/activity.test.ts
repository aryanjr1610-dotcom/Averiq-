import { beforeEach, describe, expect, it, vi } from 'vitest';
import { progressRepository } from './repository';

const mock = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/supabase', () => ({
  getSupabase: () => ({ auth: { getUser: mock.getUser }, rpc: mock.rpc }),
}));

describe('study activity save feedback', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mock.getUser.mockResolvedValue({ data: { user: { id: 'student' } } });
  });

  it('reports rejected writes so the screen can offer retry', async () => {
    mock.rpc.mockResolvedValue({ error: { message: 'Write rejected' } });
    await expect(progressRepository.logActivity({ kind: 'revision_completed' })).rejects.toThrow('Write rejected');
  });

  it('does not claim success after the session expires', async () => {
    mock.getUser.mockResolvedValue({ data: { user: null } });
    await expect(progressRepository.logActivity({ kind: 'practice_completed' })).rejects.toThrow('Sign in');
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it('uses the validated activity RPC for a successful completion', async () => {
    mock.rpc.mockResolvedValue({ error: null });
    await progressRepository.logActivity({
      kind: 'flashcards_completed',
      chapterId: 'chapter',
      metadata: { cards: 3 },
    });

    expect(mock.rpc).toHaveBeenCalledWith('log_activity_v1', {
      p_kind: 'flashcards_completed',
      p_subject_id: null,
      p_chapter_id: 'chapter',
      p_topic_id: null,
      p_lesson_id: null,
      p_exam_key: null,
      p_metadata: { cards: 3 },
    });
  });
});
