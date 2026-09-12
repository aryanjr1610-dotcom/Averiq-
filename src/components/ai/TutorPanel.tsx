import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Square, Sparkles } from "lucide-react";
import { tr } from "@/lib/motion";
import { Textarea } from "@/components/ui/Input";

export interface TutorMessage { id: string; role: "user" | "assistant"; content: ReactNode; streaming?: boolean }

interface Props {
  /** Desktop → docked side panel. Mobile → full-height page/sheet. */
  layout: "panel" | "fullscreen";
  /** Subtle, one line, dismissible — not a giant context card. */
  context?: { label: string; onClear?: () => void };
  messages: TutorMessage[];
  streaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

export function TutorPanel({ layout, context, messages, streaming, onSend, onStop }: Props) {
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  // Follow the stream only while the user is already at the bottom.
  useEffect(() => {
    const el = scroller.current;
    if (!el || !pinned.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 72;
  };

  const submit = () => {
    const text = draft.trim();
    if (!text || streaming) return;
    setDraft("");
    onSend(text);
  };

  return (
    <section
      aria-label="AI tutor"
      className={[
        "flex min-h-0 flex-col border-line-subtle bg-surface/50",
        layout === "panel" ? "h-dvh w-[min(420px,34vw)] border-l" : "h-dvh w-full",
      ].join(" ")}
    >
      <header className="flex shrink-0 items-center gap-2.5 border-b border-line-subtle px-4 py-3">
        <Sparkles className="h-[17px] w-[17px] stroke-[1.75] text-subject" aria-hidden />
        <h2 className="t-card-title">Tutor</h2>
        {context && (
          <span className="ml-auto flex min-w-0 items-center gap-2 rounded-full border border-line-subtle bg-surface-interactive/60 px-2.5 py-1">
            <span className="truncate t-caption text-content-secondary">{context.label}</span>
            {context.onClear && (
              <button onClick={context.onClear} aria-label="Clear lesson context"
                className="shrink-0 rounded-sm t-caption text-content-tertiary transition-colors duration-fast hover:text-content">
                ×
              </button>
            )}
          </span>
        )}
      </header>

      <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <ul className="mx-auto flex max-w-prose flex-col gap-5">
          {messages.map((m) => (
            <li key={m.id}>
              {m.role === "user" ? (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg rounded-br-sm border border-line bg-surface-interactive px-3.5 py-2.5 t-body">
                    {m.content}
                  </div>
                </div>
              ) : (
                /* Assistant replies are prose, not bubbles — KaTeX gets full width. */
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={tr.standard}
                  className="reader !max-w-none !px-0 !font-sans [&>*+*]:mt-3 [&_h2]:mt-6 [&_h2]:text-[1.0625rem] [&_p]:text-[0.9375rem] [&_p]:leading-[1.65]"
                >
                  {m.content}
                  {m.streaming && (
                    <span aria-hidden className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.15em] animate-pulse bg-subject" />
                  )}
                </motion.div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <footer className="safe-b shrink-0 border-t border-line-subtle p-3">
        <div className="mx-auto flex max-w-prose items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
            }}
            rows={1}
            placeholder="Ask about this topic…"
            aria-label="Message the tutor"
            className="max-h-40 min-h-[44px] flex-1 !rounded-md py-3"
          />
          <button
            type="button"
            onClick={streaming ? onStop : submit}
            disabled={!streaming && !draft.trim()}
            aria-label={streaming ? "Stop generating" : "Send message"}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-content text-canvas transition-[opacity,transform] duration-fast active:scale-[0.96] disabled:opacity-35 motion-reduce:active:scale-100"
          >
            {streaming ? <Square className="h-3.5 w-3.5 fill-current stroke-none" aria-hidden />
                       : <ArrowUp className="h-[18px] w-[18px] stroke-[2.25]" aria-hidden />}
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-prose t-caption text-content-tertiary">
          Enter to send · Shift + Enter for a new line
        </p>
      </footer>
    </section>
  );
}
