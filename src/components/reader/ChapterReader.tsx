import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Info, Play, Lightbulb, AlertTriangle } from "lucide-react";
import { duration, ease } from "@/lib/motion";

/* ---------------- Callouts: 3 kinds, subtle, never neon ---------------- */
const CALLOUT = {
  note:   { icon: Info,          tint: "--info-500", label: "Note" },
  insight:{ icon: Lightbulb,     tint: "--subject-accent", label: "Insight" },
  caution:{ icon: AlertTriangle, tint: "--warn-500", label: "Common mistake" },
} as const;

export function Callout({
  kind = "note", title, children,
}: { kind?: keyof typeof CALLOUT; title?: string; children: ReactNode }) {
  const { icon: Icon, tint, label } = CALLOUT[kind];
  return (
    <aside
      className="my-7 flex gap-3.5 rounded-md border border-l-2 p-4 font-sans"
      style={{
        borderColor: `rgb(var(${tint}) / 0.22)`,
        borderLeftColor: `rgb(var(${tint}) / 0.65)`,
        background: `rgb(var(${tint}) / 0.05)`,
      }}
    >
      <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 stroke-[1.75]" style={{ color: `rgb(var(${tint}))` }} aria-hidden />
      <div className="min-w-0">
        <p className="t-label mb-1 text-content">{title ?? label}</p>
        <div className="t-body-sm leading-[1.6] text-content-secondary [&>*+*]:mt-2">{children}</div>
      </div>
    </aside>
  );
}

/* ------------- Derivation: reveals height, equation does not bounce ------------- */
export function Derivation({ steps, summary }: { steps: ReactNode[]; summary: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-7 overflow-hidden rounded-md border border-line-subtle bg-surface/60 font-sans">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors duration-fast hover:bg-surface-interactive/50"
      >
        <span className="t-label">{summary}</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 stroke-[1.75] text-content-tertiary transition-transform duration-standard ease-out"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
          aria-hidden
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: { height: { duration: duration.standard, ease: ease.out }, opacity: { duration: duration.fast, delay: 0.05 } } }}
            exit={{ height: 0, opacity: 0, transition: { height: { duration: duration.fast, ease: ease.standard }, opacity: { duration: 0.08 } } }}
            className="overflow-hidden"
          >
            <ol className="border-t border-line-subtle px-4 py-4">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-4 border-b border-line-subtle py-3 last:border-0">
                  <span className="t-caption num mt-1 w-4 shrink-0 text-content-tertiary">{i + 1}</span>
                  <div className="min-w-0 flex-1 overflow-x-auto">{s}</div>
                </li>
              ))}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --------------- Inline visual → Visual Lab, shared-element ready --------------- */
export function InlineVisual({
  title, caption, thumbnail, onOpen, layoutId,
}: { title: string; caption: string; thumbnail: ReactNode; onOpen: () => void; layoutId: string }) {
  return (
    <figure className="my-8">
      <motion.button
        layoutId={layoutId}
        type="button"
        onClick={onOpen}
        className="group relative block w-full overflow-hidden bg-surface-immersive text-left"
        aria-label={`Open interactive: ${title}`}
      >
        <div className="aspect-[16/9] w-full">{thumbnail}</div>
        <span className="absolute inset-0 flex items-end justify-between gap-4 bg-gradient-to-t from-[rgb(var(--n-1000)/0.72)] to-transparent p-4">
          <span className="t-label font-sans text-[rgb(var(--n-50))]">{title}</span>
          <span className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[rgb(var(--n-50)/0.94)] px-3 t-caption font-sans font-medium text-[rgb(var(--n-1000))] transition-transform duration-fast group-hover:scale-[1.02] motion-reduce:transform-none">
            <Play className="h-3.5 w-3.5 fill-current stroke-none" aria-hidden />
            Open interactive
          </span>
        </span>
      </motion.button>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

/* ------------------------ Sticky outline + reading progress ------------------------ */
export function ChapterReader({
  title, subject, sections, children,
}: {
  title: string; subject: string;
  sections: { id: string; label: string }[];
  children: ReactNode;
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-88px 0px -66% 0px", threshold: 0 }
    );
    sections.forEach((s) => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [sections]);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="relative">
      {/* Reading progress: 2px, top, transform-only */}
      <div aria-hidden className="fixed inset-x-0 top-0 z-sticky h-[2px] bg-transparent">
        <div
          className="h-full origin-left bg-subject"
          style={{ transform: `scaleX(${progress})`, willChange: "transform" }}
        />
      </div>

      <div className="mx-auto grid max-w-[1240px] gap-12 xl:grid-cols-[1fr_200px]">
        <article className="min-w-0">
          <header className="mx-auto mb-12 max-w-reading px-page-x">
            <p className="t-overline mb-3 text-content-secondary">{subject}</p>
            <h1 className="t-display text-balance">{title}</h1>
          </header>
          <div className="reader">{children}</div>
        </article>

        {/* Outline: desktop only, quiet, never a card stack */}
        <nav aria-label="On this page" className="hidden xl:block">
          <div className="sticky top-8">
            <p className="t-overline mb-3 text-content-tertiary">On this page</p>
            <ul className="flex flex-col gap-0.5 border-l border-line-subtle">
              {sections.map((s) => {
                const active = s.id === activeId;
                return (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      aria-current={active ? "location" : undefined}
                      className={[
                        "-ml-px block border-l-2 py-1.5 pl-3.5 t-body-sm transition-colors duration-fast",
                        active
                          ? "border-subject text-content"
                          : "border-transparent text-content-tertiary hover:border-line-strong hover:text-content-secondary",
                      ].join(" ")}
                    >
                      {s.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </div>
    </div>
  );
}
