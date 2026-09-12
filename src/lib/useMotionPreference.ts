import { useEffect, useState } from 'react';

/** True when OS reduced-motion OR the app's Low Power mode is on. */
export function usePrefersReducedMotion(lowPowerMode = false) {
  const [osReduced, setOsReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setOsReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return osReduced || lowPowerMode;
}
