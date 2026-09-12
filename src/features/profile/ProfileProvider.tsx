import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { PropsWithChildren } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { friendlyError } from '@/features/auth/auth-actions';

import type { AcademicProfile } from '@/types/student';

import { profileService } from './profile-service';

type ProfileState =
  | { status: 'idle' | 'loading'; profile: null }
  | { status: 'ready'; profile: AcademicProfile | null }
  | { status: 'error'; profile: null; message: string };

type Snapshot = {
  owner: string | null;
  state: ProfileState;
};

type ProfileContextValue = ProfileState & {
  refresh: () => Promise<AcademicProfile | null>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const currentOwner = useRef(userId);
  const sequence = useRef(0);
  const alive = useRef(true);

  const [snapshot, setSnapshot] = useState<Snapshot>({
    owner: null,
    state: { status: 'idle', profile: null },
  });

  useLayoutEffect(() => {
    currentOwner.current = userId;
    sequence.current += 1;
  }, [userId]);

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
      sequence.current += 1;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!userId || currentOwner.current !== userId) {
      return null;
    }

    const request = ++sequence.current;

    setSnapshot({
      owner: userId,
      state: { status: 'loading', profile: null },
    });

    try {
      const profile = await profileService.getProfile(userId);

      if (
        alive.current &&
        request === sequence.current &&
        currentOwner.current === userId
      ) {
        setSnapshot({
          owner: userId,
          state: { status: 'ready', profile },
        });
      }

      return profile;
    } catch (error) {
      if (
        alive.current &&
        request === sequence.current &&
        currentOwner.current === userId
      ) {
        setSnapshot({
          owner: userId,
          state: {
            status: 'error',
            profile: null,
            message: friendlyError(error),
          },
        });
      }

      throw error;
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setSnapshot({
        owner: null,
        state: { status: 'idle', profile: null },
      });
      return;
    }

    void refresh().catch(() => {
      // Error is represented by provider state.
    });

    return () => {
      sequence.current += 1;
    };
  }, [userId, refresh]);

  const value = useMemo(() => {
    const state: ProfileState = !userId
      ? { status: 'idle', profile: null }
      : snapshot.owner === userId
        ? snapshot.state
        : { status: 'loading', profile: null };

    return { ...state, refresh };
  }, [userId, snapshot, refresh]);

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider.');
  }

  return context;
}
