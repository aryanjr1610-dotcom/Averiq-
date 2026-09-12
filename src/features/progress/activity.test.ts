import { beforeEach, describe, expect, it, vi } from 'vitest';
import { progressRepository } from './repository';

const mock = vi.hoisted(() => ({ getUser: vi.fn(), insert: vi.fn(), from: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ getSupabase: () => ({ auth: { getUser: mock.getUser }, from: mock.from }) }));

describe('study activity save feedback', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mock.getUser.mockResolvedValue({ data: { user: { id: 'student' } } });
    mock.from.mockReturnValue({ insert: mock.insert });
  });
  it('reports rejected writes so the screen can offer retry', async () => {
    mock.insert.mockResolvedValue({ error: { message: 'Write rejected' } });
    await expect(progressRepository.logActivity({ kind: 'revision_completed' })).rejects.toThrow('Write rejected');
  });
  it('does not claim success after the session expires', async () => {
    mock.getUser.mockResolvedValue({ data: { user: null } });
    await expect(progressRepository.logActivity({ kind: 'practice_completed' })).rejects.toThrow('Sign in');
    expect(mock.insert).not.toHaveBeenCalled();
  });
  it('uses the existing activity contract for a successful completion', async () => {
    mock.insert.mockResolvedValue({ error: null });
    await progressRepository.logActivity({ kind: 'flashcards_completed', chapterId: 'chapter', metadata: { cards: 3 } });
    expect(mock.from).toHaveBeenCalledWith('activity_events');
    expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({ kind: 'flashcards_completed', user_id: 'student', chapter_id: 'chapter', metadata: { cards: 3 } }));
  });
});
