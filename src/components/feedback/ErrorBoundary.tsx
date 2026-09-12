import { Component } from 'react';

import type {
  ErrorInfo,
  ReactNode,
} from 'react';

import { isDevelopment } from '@/app/config/env';

import { ErrorState } from '@/components/system/States';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<
  Props,
  State
> {
  state: State = {
    error: null,
  };

  static getDerivedStateFromError(
    error: Error,
  ): State {
    return { error };
  }

  componentDidCatch(
    error: Error,
    info: ErrorInfo,
  ) {
    if (isDevelopment) {
      console.error(
        '[Averiq boundary]',
        error,
        info.componentStack,
      );
    }

    // Add production telemetry here when selected.
    // Redact tokens and personal data before reporting.
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main
        className="container"
        id="main-content"
        tabIndex={-1}
      >
        <ErrorState
          message="The application could not continue. Try again or return home."
          retry={() => {
            this.setState({ error: null });
          }}
        />

        {isDevelopment && (
          <details className="dev-details">
            <summary>
              Development details
            </summary>

            <pre>
              {this.state.error.message}
            </pre>
          </details>
        )}
      </main>
    );
  }
}
