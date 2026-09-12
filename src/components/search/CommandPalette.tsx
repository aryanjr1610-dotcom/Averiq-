import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search as SearchIcon, CornerDownLeft } from "lucide-react";
import { tr, spring } from "@/lib/motion";

export interface SearchHit {
  id: string; group: "Chapters" | "Formulas" | "Notes" | "Practice" | "Navigate";
  title: string; subtitle?: string; to: string;
}

export function CommandPalette({
  onClose, search,
}: { onClose: () => void; search?: (q: string) => Promise<SearchHit[]> }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!search) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await search(q);
        if (!cancelled) { setHits(r); setIndex(0); }
      } finally { if (!cancelled) setBusy(false); }
    }, 140);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, search]);

  const flat = useMemo(() => hits, [hits]);
  const grouped = useMemo(() => {
    const m = new Map<string, SearchHit[]>();
    flat.forEach((h) => m.set(h.group, [...(m.get(h.group) ?? []), h]));
    return [...m.entries()];
  }, [flat]);

  const go = (hit?: SearchHit) => { if (!hit) return; navigate(hit.to); onClose(); };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(flat.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); go(flat[index]); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-modal">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={tr.fast}
          onClick={onClose} className="absolute inset-0 bg-[rgb(var(--n-1000)/0.62)] backdrop-blur-[2px]"
        />
        <motion.div
          role="dialog" aria-modal="true" aria-label="Search Averiq"
          initial={{ opacity: 0, y: 12, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: spring.responsive }}
          exit={{ opacity: 0, y: 8, scale: 0.99, transition: tr.fast }}
          onKeyDown={onKeyDown}
          className="absolute inset-x-3 top-[10dvh] mx-auto max-w-xl overflow-hidden rounded-2xl border border-line bg-surface-overlay shadow-e3 sm:inset-x-4"
        >
          <div className="flex items-center gap-3 border-b border-line-subtle px-4">
            <SearchIcon className="h-[18px] w-[18px] shrink-0 stroke-[1.75] text-content-tertiary" aria-hidden />
            <input
              ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search chapters, formulas, notes…"
              aria-label="Search query"
              role="combobox" aria-expanded aria-controls="cp-list" aria-activedescendant={flat[index]?.id}
              className="h-14 w-full bg-transparent t-body-lg text-content outline-none placeholder:text-content-tertiary"
            />
            <kbd className="t-caption hidden shrink-0 rounded-xs border border-line px-1.5 py-0.5 text-content-tertiary sm:block">esc</kbd>
          </div>

          <div id="cp-list" role="listbox" className="max-h-[56dvh] overflow-y-auto p-2">
            {busy && flat.length === 0 && <PaletteSkeleton />}
            {!busy && q && flat.length === 0 && (
              <p className="px-3 py-8 text-center t-body-sm text-content-secondary">
                No results for “{q}”. Try a chapter or formula name.
              </p>
            )}
            {grouped.map(([group, items]) => (
              <section key={group} className="mb-2 last:mb-0">
                <p className="t-overline px-3 py-2 text-content-tertiary">{group}</p>
                <ul>
                  {items.map((hit) => {
                    const i = flat.indexOf(hit);
                    const active = i === index;
                    return (
                      <li key={hit.id}>
                        <button
                          id={hit.id} role="option" aria-selected={active}
                          onMouseEnter={() => setIndex(i)} onClick={() => go(hit)}
                          className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-instant ${
                            active ? "bg-surface-interactive" : ""
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate t-body">{hit.title}</span>
                            {hit.subtitle && (
                              <span className="block truncate t-caption text-content-secondary">{hit.subtitle}</span>
                            )}
                          </span>
                          {active && <CornerDownLeft className="h-4 w-4 shrink-0 stroke-[1.75] text-content-tertiary" aria-hidden />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function PaletteSkeleton() {
  return (
    <ul className="p-1">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex flex-col gap-1.5 px-3 py-2.5">
          <span className="skeleton h-3.5 rounded-xs" style={{ width: `${58 - i * 7}%` }} />
          <span className="skeleton h-2.5 w-1/3 rounded-xs" />
        </li>
      ))}
    </ul>
  );
}

/** Global ⌘K / Ctrl+K binding */
export function useCommandShortcut(open: () => void) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); open(); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [open]);
}
