import { useEffect } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/system/States';

export default function NotFoundPage() {
  useEffect(() => {
    document.title = 'Page not found | Averiq';
  }, []);

  return (
    <EmptyState
      title="This page isn’t here."
      description="Check the address, or head back to Averiq."
      action={
        <Link
          className="button button--primary"
          to="/"
        >
          Return home
        </Link>
      }
    />
  );
}
