import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { useAcademicTheme } from '@/app/providers/AcademicThemeProvider';
import { Button } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';
import { ReaderReturnSchema } from '@/features/learning/reading';

import { visualizationDefinition } from './registry';
import { Visualization } from './Visualization';

export default function VisualLabPage() {
  const { visualizationId } = useParams();
  const location = useLocation();
  const theme = useAcademicTheme();

  const definition = visualizationDefinition(visualizationId ?? '');

  const origin = ReaderReturnSchema.safeParse(
    (location.state as { readerReturn?: unknown } | null)?.readerReturn,
  );

  useEffect(() => {
    if (!definition) return;

    document.title = `${definition.title} | Averiq Visual Lab`;

    theme.setContext({
      ...theme.context,
      subjectId: definition.subject,
      page: 'visual-lab',
    });

    // The route owns this context; the next route's bridge restores its context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition?.id, theme.setContext]);

  if (!definition) {
    return (
      <main className="mx-auto w-full max-w-content px-page-x py-block">
        <h1 className="t-page-title">Visualization unavailable</h1>
        <p className="t-body-sm mt-2 text-content-secondary">The requested visualization is not registered.</p>
        <div className="mt-4">
          <Button variant="secondary" size="md">
            <Link to="/app/dashboard">Return to Averiq</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-content px-page-x py-block">
      <div className="mb-4">
        {origin.success ? (
          <Button variant="ghost" size="sm">
            <Link
              to={`${origin.data.path}#${origin.data.anchor}`}
              state={{ readerReturn: origin.data }}
            >
              ← Return to reading
            </Link>
          </Button>
        ) : (
          <Button variant="ghost" size="sm">
            <Link to="/app/dashboard">← Return to Averiq</Link>
          </Button>
        )}
      </div>

      <header className="mb-6">
        <h1 className="t-page-title">{definition.title}</h1>
        <p className="t-caption mt-1 text-content-secondary">
          Original educational model · interactive lab
        </p>
      </header>

      <Surface kind="base" padding="md" className="overflow-hidden">
        <Visualization id={definition.id} opened />
      </Surface>
    </main>
  );
}
