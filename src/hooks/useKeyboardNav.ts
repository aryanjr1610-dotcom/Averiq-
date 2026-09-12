import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

/**
 * Arrow-key navigation over a homogeneous option list (practice answers,
 * flashcard actions, subject tiles). One tab stop, arrows move focus.
 */
export function useRovingFocus<T extends HTMLElement>(count: number, orientation: "vertical" | "horizontal" = "vertical") {
  const [active, setActive] = useState(0);
  const refs = useRef<(T | null)[]>([]);

  const register = useCallback((i: number) => (el: T | null) => { refs.current[i] = el; }, []);

  const onKeyDown = useCallback((e: ReactKeyboardEvent) => {
    const next = orientation === "vertical" ? "ArrowDown" : "ArrowRight";
    const prev = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
    let target = active;
    if (e.key === next) target = (active + 1) % count;
    else if (e.key === prev) target = (active - 1 + count) % count;
    else if (e.key === "Home") target = 0;
    else if (e.key === "End") target = count - 1;
    else return;
    e.preventDefault();
    setActive(target);
    refs.current[target]?.focus();
  }, [active, count, orientation]);

  const props = (i: number) => ({ ref: register(i), tabIndex: i === active ? 0 : -1 });

  return { active, setActive, onKeyDown, props };
}

/** Global "g + key" navigation, matching the shortcuts declared in navigation.ts */
export function useGoToShortcuts(map: Record<string, string>, navigate: (to: string) => void) {
  useEffect(() => {
    let armed = false;
    let timer = 0;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.matches("input, textarea, [contenteditable='true']")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "g") { armed = true; window.clearTimeout(timer); timer = window.setTimeout(() => (armed = false), 1200); return; }
      const target = map[e.key];
      if (armed && target) { e.preventDefault(); armed = false; navigate(target); }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); window.clearTimeout(timer); };
  }, [map, navigate]);
}
