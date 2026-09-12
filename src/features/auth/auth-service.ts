import type { Session } from '@supabase/supabase-js';

import { getSupabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';

import {
  allowPasswordRecovery,
  clearPasswordRecovery,
} from './recovery';

export const authService = {
  async restoreSession(): Promise<Session | null> {
    try {
      const { data, error } = await getSupabase().auth.getSession();

      if (error) throw error;

      return data.session;
    } catch (error) {
      throw toAppError(error, 'AUTH_ERROR');
    }
  },

  subscribe(
    listener: (session: Session | null) => void,
  ): () => void {
    const { data } = getSupabase().auth.onAuthStateChange(
      (event, session) => {
        // Keep this callback synchronous.
        if (event === 'PASSWORD_RECOVERY' && session) {
          allowPasswordRecovery(session.user.id);
        }

        if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
          clearPasswordRecovery();
        }

        listener(session);
      },
    );

    return () => data.subscription.unsubscribe();
  },

  async signOut(): Promise<void> {
    try {
      const { error } = await getSupabase().auth.signOut({
        scope: 'local',
      });

      if (error) throw error;

      clearPasswordRecovery();
    } catch (error) {
      throw toAppError(error, 'AUTH_ERROR');
    }
  },
};
