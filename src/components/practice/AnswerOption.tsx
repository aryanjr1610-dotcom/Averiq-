import { type ReactNode } from "react";
import { Check, X, Circle } from "lucide-react";

type State = "idle" | "selected" | "correct" | "incorrect" | "missed";

/** Never colour alone: every state also has an icon, a border weight and a text label. */
const STATE = {
  idle:      { ring: "border-line",       bg: "bg-surface",           icon: Circle, tint: "text-content-tertiary", note: "" },
  selected:  { ring: "border-accent/70",  bg: "bg-accent/10",         icon: Circle, tint: "text-accent-text",      note: "Selected" },
  correct:   { ring: "border-ok/70",      bg: "bg-ok/10",             icon: Check,  tint: "text-ok",               note: "Correct" },
  incorrect: { ring: "border-bad/70",     bg: "bg-bad/10",            icon: X,      tint: "text-bad",              note: "Incorrect" },
  missed:    { ring: "border-ok/40 border-dashed", bg: "bg-surface",  icon: Check,  tint: "text-ok",               note: "Correct answer" },
} as const;

export function AnswerOption({
  label, letter, state = "idle", disabled, onSelect,
}: { label: ReactNode; letter: string; state?: State; disabled?: boolean; onSelect: () => void }) {
  const s = STATE[state];
  const Icon = s.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={state === "selected"}
      className={[
        "group flex w-full items-start gap-3.5 rounded-md border-2 p-4 text-left",
        "transition-[background-color,border-color,transform,box-shadow] duration-fast ease-standard",
        s.ring, s.bg,
        !disabled && "hover:border-line-strong hover:bg-surface-interactive/70 active:scale-[0.995]",
        "motion-reduce:active:scale-100 disabled:cursor-default",
        "focus-visible:outline-2 focus-visible:outline-offset-2",
      ].filter(Boolean).join(" ")}
    >
      <span
        className={`mt-px grid h-6 w-6 shrink-0 place-items-center rounded-sm border border-line t-caption font-semibold ${
          state === "idle" ? "text-content-secondary" : `${s.tint} border-current`
        }`}
        aria-hidden
      >
        {state === "idle" || state === "selected" ? letter : <Icon className="h-3.5 w-3.5 stroke-[2.5]" />}
      </span>

      {/* Question/option text uses reading-grade size — readability beats density here */}
      <span className="min-w-0 flex-1 t-body-lg leading-[1.6]">{label}</span>

      {s.note && <span className={`t-caption mt-1 shrink-0 font-medium ${s.tint}`}>{s.note}</span>}
    </button>
  );
}
