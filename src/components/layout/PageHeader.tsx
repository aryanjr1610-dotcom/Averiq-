import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

interface Props {
  title: string;
  description?: string;
  /** Breadcrumb context, e.g. ["Physics", "Laws of Motion"] */
  context?: { label: string; to?: string }[];
  backTo?: string;
  action?: ReactNode;
  sticky?: boolean;
}

export function PageHeader({ title, description, context, backTo, action, sticky }: Props) {
  return (
    <header
      className={[
        "mb-block flex flex-col gap-3",
        sticky
          ? "sticky top-0 z-sticky -mx-page-x border-b border-line-subtle glass px-page-x py-3"
          : "",
      ].join(" ")}
    >
      {(backTo || context?.length) && (
        <div className="flex min-h-5 items-center gap-1.5">
          {backTo && (
            <Link
              to={backTo}
              className="-ml-1.5 flex items-center gap-0.5 rounded-sm py-0.5 pl-0.5 pr-1.5 t-label text-content-secondary transition-colors duration-fast hover:text-content"
            >
              <ChevronLeft className="h-4 w-4 stroke-[1.75]" aria-hidden />
              Back
            </Link>
          )}
          {context?.map((c, i) => (
            <span key={c.label} className="flex items-center gap-1.5 t-label text-content-tertiary">
              {(i > 0 || backTo) && <span aria-hidden className="text-content-tertiary/60">/</span>}
              {c.to ? (
                <Link to={c.to} className="rounded-sm transition-colors duration-fast hover:text-content-secondary">
                  {c.label}
                </Link>
              ) : c.label}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 max-w-prose">
          <h1 className="t-page-title text-balance">{title}</h1>
          {description && <p className="t-body-sm mt-1.5 text-content-secondary">{description}</p>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
    </header>
  );
}
