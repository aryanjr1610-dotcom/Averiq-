import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, X } from "lucide-react";
import { Link } from "react-router-dom";

/** No atmosphere, no gradients, no shadows. One number, three controls. */
export function Focus({ minutes = 25, taskLabel }: { minutes?: number; taskLabel?: string }) {
  const total = minutes * 60;
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const raf = useRef(0);
  const target = useRef(0);

  useEffect(() => {
    if (!running) return;
    target.current = Date.now() + left * 1000;
    const tick = () => {
      const remaining = Math.max(0, Math.round((target.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining > 0) raf.current = window.setTimeout(tick, 250);
      else setRunning(false);
    };
    tick();
    return () => window.clearTimeout(raf.current);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const pct = ((total - left) / total) * 100;

  return (
    <div className="safe-t safe-b fixed inset-0 z-modal flex flex-col bg-canvas">
      <header className="flex items-center justify-between px-page-x py-4">
        <p className="t-label truncate text-content-tertiary">{taskLabel ?? "Focus session"}</p>
        <Link
          to="/planner" aria-label="Exit focus mode"
          className="-m-2 rounded-md p-2 text-content-tertiary transition-colors duration-fast hover:text-content"
        >
          <X className="h-[18px] w-[18px] stroke-[1.75]" aria-hidden />
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-10">
        <p
          className="num tabular-nums text-[clamp(4rem,18vw,8rem)] font-light leading-none tracking-[-0.04em]"
          role="timer" aria-live="off" aria-label={`${mm} minutes ${ss} seconds remaining`}
        >
          {mm}:{ss}
        </p>

        <div
          role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}
          className="h-px w-[min(320px,70vw)] bg-[rgb(var(--border-default)/var(--border-default-a))]"
        >
          <div className="h-full bg-content-secondary transition-[width] duration-slow ease-out" style={{ width: `${pct}%` }} />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRunning((r) => !r)}
            className="inline-flex h-12 items-center gap-2.5 rounded-md border border-line px-7 t-body-sm font-medium transition-colors duration-fast hover:bg-surface-interactive active:scale-[0.98] motion-reduce:active:scale-100"
          >
            {running ? <Pause className="h-4 w-4 stroke-[2]" aria-hidden /> : <Play className="h-4 w-4 stroke-[2]" aria-hidden />}
            {running ? "Pause" : left === total ? "Start" : "Resume"}
          </button>
          <button
            onClick={() => { setRunning(false); setLeft(total); }}
            aria-label="Reset timer"
            className="grid h-12 w-12 place-items-center rounded-md border border-line-subtle text-content-tertiary transition-colors duration-fast hover:text-content"
          >
            <RotateCcw className="h-4 w-4 stroke-[1.75]" aria-hidden />
          </button>
        </div>
      </main>
    </div>
  );
}
