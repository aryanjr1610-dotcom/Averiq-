import { useEffect } from 'react';

/** Arrow keys move, 1–4 pick, Enter submits. impeccable: full keyboard parity. */
export function useAnswerKeyboard({
  count,
  active,
  setActive,
  onPick,
  onSubmit,
  enabled = true,
}: {
  count: number;
  active: number;
  setActive: (i: number) => void;
  onPick: (i: number) => void;
  onSubmit?: () => void;
  enabled?: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); setActive(Math.min(active + 1, count - 1)); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); setActive(Math.max(active - 1, 0)); }
      else if (/^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        if (i < count) { e.preventDefault(); setActive(i); onPick(i); }
      } else if (e.key === 'Enter') { e.preventDefault(); onPick(active); onSubmit?.(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, active, setActive, onPick, onSubmit, enabled]);
}
