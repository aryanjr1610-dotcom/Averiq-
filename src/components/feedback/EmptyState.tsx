import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: { label: string; onClick?: () => void; href?: string };
  secondary?: { label: string; onClick: () => void };
  /** "inline" for panels/sheets, "page" for full routes */
  size?: "inline" | "page";
}

export function EmptyState({ icon: Icon, title, body, action, secondary, size = "page" }: Props) {
  return (
    <div
      className={[
        "mx-auto flex max-w-sm flex-col items-center text-center",
        size === "page" ? "py-20" : "py-12",
      ].join(" ")}
    >
      {/* A quiet glyph in a token surface — not an illustration library */}
      <span
        aria-hidden
        className="mb-5 grid h-12 w-12 place-items-center rounded-lg border border-line-subtle bg-surface-interactive/60"
      >
        <Icon className="h-5 w-5 stroke-[1.5] text-content-tertiary" />
      </span>
      <h2 className={size === "page" ? "t-section" : "t-card-title"}>{title}</h2>
      <p className="t-body-sm mt-2 text-balance text-content-secondary">{body}</p>

      {(action || secondary) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {action &&
            (action.href ? (
              <a
                href={action.href}
                className="inline-flex h-10 items-center rounded-md bg-content px-4 t-body-sm font-medium text-canvas shadow-e1 transition-colors duration-fast hover:bg-content/90"
              >
                {action.label}
              </a>
            ) : (
              <Button variant="primary" size="md" onClick={action.onClick}>{action.label}</Button>
            ))}
          {secondary && <Button variant="ghost" size="md" onClick={secondary.onClick}>{secondary.label}</Button>}
        </div>
      )}
    </div>
  );
}

/* ---- Real copy, warm but not cutesy. Reuse these, don't reinvent per screen. ---- */
export const EMPTY_COPY = {
  notes: { title: "No notes yet", body: "Notes you write while studying appear here, linked back to the lesson they came from." },
  practice: { title: "No practice history yet", body: "Answer a few questions and you'll see accuracy, weak topics and trends here." },
  downloads: { title: "Nothing downloaded yet", body: "Download a chapter to read it without a connection — useful before a commute." },
  revision: { title: "You're all caught up", body: "No cards are due right now. New ones unlock as you finish more lessons." },
  search: { title: "Search Averiq", body: "Find chapters, formulas, your notes and past practice. Try “projectile motion”." },
  planner: { title: "Nothing scheduled", body: "Add a study block, or let Averiq suggest a plan from your syllabus progress." },
} as const;
