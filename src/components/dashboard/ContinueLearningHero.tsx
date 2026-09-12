import { Link } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import type { Subject } from "@/components/atmosphere/AcademicAtmosphere";

export interface ContinueTarget {
  subject: string; subjectKey: Subject; chapter: string; topic: string;
  progress: number; minutesLeft: number; href: string;
}

export function ContinueLearningHero({ target }: { target: ContinueTarget }) {
  const pct = Math.round(Math.min(100, Math.max(0, target.progress)));

  return (
    <Link
      to={target.href}
      data-subject={target.subjectKey}
      aria-label={`Continue ${target.subject}: ${target.chapter} — ${target.topic}, ${pct}% complete`}
      className="group relative block overflow-hidden rounded-xl border border-line bg-surface-immersive shadow-e2 transition-[border-color,box-shadow,transform] duration-standard ease-out hover:-translate-y-px hover:border-line-strong hover:shadow-e3 motion-reduce:hover:translate-y-0"
    >
      {/* Subject atmosphere, contained to the hero */}
      <div aria-hidden className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(780px 420px at 88% -20%, rgb(var(--subject-accent) / 0.26), transparent 66%),
              linear-gradient(100deg, rgb(var(--surface-immersive)) 42%, rgb(var(--subject-accent) / 0.06) 100%)`,
          }}
        />
        <svg className="absolute inset-0 h-full w-full" style={{ opacity: 0.07 }}>
          <defs>
            <pattern id="hero-motif" width="88" height="88" patternUnits="userSpaceOnUse">
              <path d="M0 64q22-36 44 0t44 0" fill="none" stroke="rgb(var(--subject-accent))" strokeWidth="1" />
              <path d="M0 24q22-36 44 0t44 0" fill="none" stroke="rgb(var(--subject-accent))" strokeWidth="0.75" opacity="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-motif)" />
        </svg>
      </div>

      <div className="relative flex flex-col gap-6 p-5 sm:flex-row sm:items-end sm:justify-between sm:gap-10 sm:p-8">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-subject" aria-hidden />
            <span className="t-overline text-content-secondary">Continue learning</span>
          </div>

          <p className="t-label mb-1.5 text-content-secondary">{target.subject}</p>
          <h2 className="t-hero text-balance">{target.chapter}</h2>
          <p className="t-body mt-2 max-w-prose text-content-secondary">{target.topic}</p>

          <div className="mt-6 flex max-w-md flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="t-caption num text-content-secondary">{pct}% complete</span>
              <span className="t-caption inline-flex items-center gap-1.5 text-content-tertiary">
                <Clock className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden />
                <span className="num">~{target.minutesLeft} min left</span>
              </span>
            </div>
            {/* Progress: role=progressbar so screen readers get the value */}
            <div
              role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
              className="h-1.5 overflow-hidden rounded-full bg-[rgb(var(--border-strong)/0.16)]"
            >
              <div
                className="h-full rounded-full bg-subject transition-[width] duration-slow ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="inline-flex h-12 items-center gap-2 rounded-md bg-content px-6 t-body-sm font-medium text-canvas shadow-e1 transition-[background-color,box-shadow] duration-fast group-hover:shadow-e2">
            Continue
            <ArrowRight className="h-4 w-4 stroke-[2] transition-transform duration-standard ease-out group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
