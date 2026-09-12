import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

export function useAnimationClock(
  running: boolean,
  speed: number,
  resetToken: number,
  container: RefObject<HTMLDivElement | null>,
) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => setElapsed(0), [resetToken]);

  useEffect(() => {
    if (!running) return;

    let frame = 0;
    let visible = true;
    let previous = 0;
    let accumulated = 0;

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      accumulated = 0;
    };

    const tick = (time: number) => {
      if (document.hidden || !visible) {
        stop();
        return;
      }

      if (previous) accumulated += Math.min((time - previous) / 1000, 0.1);
      previous = time;

      if (accumulated >= 1 / 30) {
        const delta = accumulated * speed;
        accumulated = 0;
        setElapsed((value) => value + delta);
      }

      frame = requestAnimationFrame(tick);
    };

    const sync = () => {
      stop();
      if (!document.hidden && visible) frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      sync();
    });

    if (container.current) observer.observe(container.current);

    document.addEventListener('visibilitychange', sync);
    sync();

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [running, speed, resetToken, container]);

  return elapsed;
}
