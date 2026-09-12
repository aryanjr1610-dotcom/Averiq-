import {
  isRouteErrorResponse,
  useRouteError,
} from 'react-router-dom';

import { isDevelopment } from '@/app/config/env';

import { ErrorState } from '@/components/system/States';

import { toAppError } from '@/lib/errors';

export function RouteError() {
  const error: unknown = useRouteError();

  const missing =
    isRouteErrorResponse(error) &&
    error.status === 404;

  return (
    <main
      className="container"
      id="main-content"
      tabIndex={-1}
    >
      <ErrorState
        title={
          missing
            ? 'Page not found'
            : 'This page could not open'
        }
        message={
          missing
            ? 'Check the address or return home.'
            : toAppError(error).message
        }
        retry={() => {
          window.location.reload();
        }}
      />

      {isDevelopment && error instanceof Error && (
        <details className="dev-details">
          <summary>
            Development details
          </summary>

          <pre>{error.message}</pre>
        </details>
      )}
    </main>
  );
}
