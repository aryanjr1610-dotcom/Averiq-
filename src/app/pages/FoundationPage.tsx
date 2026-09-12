import { useEffect } from 'react';

import { BookOpen } from 'lucide-react';

import { EmptyState } from '@/components/system/States';

/**
 * Temporary product-development copy.
 * This is not curriculum or a fake dashboard.
 */
const copy = {
  welcome: [
    'Foundation ready.',
    'Averiq’s engineering foundation is in place. Phase 2 owns the visual design system.',
  ],

  auth: [
    'Authentication UI is not built yet.',
    'Session infrastructure is available. Sign-in and account-creation screens arrive in Phase 3.',
  ],

  onboarding: [
    'Onboarding is not built yet.',
    'Your session is restored. Profile-backed onboarding arrives in Phase 4; no completion is saved here.',
  ],

  app: [
    'Application foundation.',
    'This is an internal foundation page, not the Averiq dashboard.',
  ],
} as const;

type FoundationPageProps = {
  section?: keyof typeof copy;
};

export default function FoundationPage({
  section = 'welcome',
}: FoundationPageProps) {
  const [title, description] = copy[section];

  useEffect(() => {
    document.title = `${title} | Averiq`;
  }, [title]);

  return (
    <EmptyState
      icon={<BookOpen size={30} />}
      title={title}
      description={description}
    />
  );
}
