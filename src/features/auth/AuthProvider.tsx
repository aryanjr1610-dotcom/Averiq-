import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { PropsWithChildren } from 'react';

import type {
  Session,
  User,
} from '@supabase/supabase-js';

import {
  AppError,
  toAppError,
} from '@/lib/errors';

import { authService } from './auth-service';

export type AuthState =
  | {
      status: 'loading';
    }
  | {
      status: 'authenticated';
      session: Session;
    }
  | {
      status: 'unauthenticated';
    }
  | {
      status: 'error';
      error: AppError;
    };

type AuthContextValue = {
  state: AuthState;
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  retry: () => void;
  signOut: () => Promise<void>;
};

const AuthContext =
  createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({
    status: 'loading',
  });

  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  const signOut = useCallback(
    () => authService.signOut(),
    [],
  );

  useEffect(() => {
    let active = true;
    let revision = 0;
    let unsubscribe = () => {};

    setState({ status: 'loading' });

    const timer = window.setTimeout(() => {
      if (active) {
        setState({
          status: 'error',
          error: new AppError('NETWORK_ERROR'),
        });
      }
    }, 12000);

    const accept = (session: Session | null) => {
      window.clearTimeout(timer);

      if (!active) {
        return;
      }

      setState(
        session
          ? {
              status: 'authenticated',
              session,
            }
          : {
              status: 'unauthenticated',
            },
      );
    };

    try {
      unsubscribe = authService.subscribe(
        (session) => {
          revision += 1;
          accept(session);
        },
      );

      const startedAt = revision;

      void authService
        .restoreSession()
        .then((session) => {
          /*
           * A newer auth event wins over a stale
           * initial session-restoration result.
           */
          if (
            active &&
            revision === startedAt
          ) {
            accept(session);
          }
        })
        .catch((error: unknown) => {
          if (
            active &&
            revision === startedAt
          ) {
            window.clearTimeout(timer);

            setState({
              status: 'error',
              error: toAppError(
                error,
                'AUTH_ERROR',
              ),
            });
          }
        });
    } catch (error) {
      window.clearTimeout(timer);

      setState({
        status: 'error',
        error: toAppError(
          error,
          'AUTH_ERROR',
        ),
      });
    }

    return () => {
      active = false;
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [attempt]);

  const session =
    state.status === 'authenticated'
      ? state.session
      : null;

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      session,
      user: session?.user ?? null,

      isLoading:
        state.status === 'loading',

      isAuthenticated:
        state.status === 'authenticated',

      retry,
      signOut,
    }),
    [
      state,
      session,
      retry,
      signOut,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within AuthProvider.',
    );
  }

  return context;
}
