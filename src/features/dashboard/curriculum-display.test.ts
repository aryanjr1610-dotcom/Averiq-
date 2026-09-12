import { describe, expect, it, vi } from 'vitest';
import { loadDashboardData } from './dashboard-data';

vi.mock('@/features/curriculum/repository', () => ({
  curriculumRepository: {
    resolveMyCurriculum: async () => ({ subjects: [{ id: 'physics-placement', title: 'Physics', slug: 'physics' }] }),
  },
}));
vi.mock('@/features/competitive/repository', () => ({ competitiveRepository: { resolveMyExams: async () => [] } }));
vi.mock('@/features/progress/analytics', () => ({ loadAnalytics: async () => ({ weak: [] }), buildRecommendations: async () => [] }));
vi.mock('@/features/progress/repository', () => ({ progressRepository: { recentLessons: async () => [], studyTrend: async () => [], recentActivity: async () => [] } }));
vi.mock('@/lib/supabase', () => ({ getSupabase: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) }));

describe('dashboard curriculum display', () => {
  it('displays the curriculum title instead of silently dropping subjects without a name field', async () => {
    const result = await loadDashboardData();
    expect(result.subjects).toEqual({ status: 'ready', data: [{ id: 'physics-placement', name: 'Physics', slug: 'physics' }] });
  });
});
