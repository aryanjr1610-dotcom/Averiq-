import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { friendlyError } from './auth-actions';

export function useAction() {
  const pending = useRef(false);
  const mounted = useRef(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (action: () => Promise<void>) => {
    if (pending.current) return;

    pending.current = true;
    setBusy(true);
    setError(null);

    try {
      await action();
    } catch (cause) {
      if (mounted.current) setError(friendlyError(cause));
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);

  return { busy, error, run };
}
