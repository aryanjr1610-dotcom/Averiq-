import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Sigma, NotebookPen, HeartPulse, Trophy, ArrowUpRight, BookOpen } from "lucide-react";
import { staggerParent, staggerChild } from "@/lib/motion";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ContinueLearningHero, type ContinueTarget } from "@/components/dashboard/ContinueLearningHero";

export interface DashboardData {
  firstName: string;
  streamLabel: string;     // "Class 11 · PCM"
  continueTarget: ContinueTarget | null;
  today: { label: string; detail: string; href: string }[];
  metrics: { label: string; value: string; delta?: string }[];
  dueRevision: number;
  practiceAccuracy: number;
}

const greet = (h = new Date().getHours()) =>
  h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 22 ? "Good evening" : "Winding down";

export function Dashboard({ data }: { data: DashboardData }) {
  const navigate = useNavigate();

  return (
    <motion.div variants={staggerParent} initial="initial" animate="animate" className="flex flex-col gap-section">
      {/* 1 — Greeting + academic context. Text, not a card. */}
      <motion.header variants={staggerChild} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h1 className="t-page-title">
          {greet()}, {data.firstName}
        </h1>
        <p className="t-label text-content-secondary">{data.streamLabel}</p>
      </motion.header>

      {/* 2 — The hero. Widest visual weight in the app. */}
      <motion.section variants={staggerChild} aria-labelledby="continue-h">
        <h2 id="continue-h" className="sr-only">Continue learning</h2>
        {data.continueTarget ? (
          <ContinueLearningHero target={data.continueTarget} />
        ) : (
          <Surface kind="base" padding="lg">
            <EmptyState
              size="inline"
              icon={BookOpen}
              title={data.streamLabel ? "Pick a subject to start" : "Finish setting up"}
              body={data.streamLabel
                ? "Open any subject and Averiq will pick up where you left off from here."
                : "Tell Averiq your board, class and stream and your syllabus loads instantly."}
              action={{
                label: data.streamLabel ? "Browse subjects" : "Complete setup",
                onClick: () => navigate(data.streamLabel ? "/app/learn" : "/onboarding"),
              }}
            />
          </Surface>
        )}
      </motion.section>

      {/* 3 — Asymmetric: today (7) + progress (5). Never equal columns. */}
      <motion.div variants={staggerChild} className="grid gap-block lg:grid-cols-12">
        <section aria-labelledby="today-h" className="lg:col-span-7">
          <SectionHead id="today-h" title="Today" to="/planner" linkLabel="Open planner" />
          <ul className="flex flex-col gap-2">
            {data.today.map((t) => (
              <li key={t.label}>
                <Surface kind="interactive" as={Link} padding="md" {...{ to: t.href }}
                  className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="t-card-title truncate">{t.label}</p>
                    <p className="t-body-sm mt-0.5 truncate text-content-secondary">{t.detail}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 stroke-[1.75] text-content-tertiary" aria-hidden />
                </Surface>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="progress-h" className="lg:col-span-5">
          <SectionHead id="progress-h" title="Progress" to="/progress" linkLabel="Details" />
          <Surface kind="base" padding="lg">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-6">
              {data.metrics.map((m) => (
                <div key={m.label}>
                  <dd className="t-metric">{m.value}</dd>
                  <dt className="t-caption mt-1 text-content-secondary">{m.label}</dt>
                  {m.delta && <p className="t-caption num mt-1 text-ok">{m.delta}</p>}
                </div>
              ))}
            </dl>
          </Surface>
        </section>
      </motion.div>

      {/* 4 — Revision / Practice: two equal, because they ARE peers. */}
      <motion.div variants={staggerChild} className="grid gap-block sm:grid-cols-2">
        <Surface kind="base" padding="lg" className="flex flex-col gap-4">
          <div>
            <p className="t-overline text-content-tertiary">Revision</p>
            <p className="t-section mt-2">
              <span className="num">{data.dueRevision}</span> cards due
            </p>
            <p className="t-body-sm mt-1 text-content-secondary">Spaced repetition keeps retention high.</p>
          </div>
          <Button as-child variant="subject" size="md" className="mt-auto w-fit" onClick={undefined}>
            <Link to="/revision">Start revision</Link>
          </Button>
        </Surface>

        <Surface kind="base" padding="lg" className="flex flex-col gap-4">
          <div>
            <p className="t-overline text-content-tertiary">Practice</p>
            <p className="t-section mt-2 num">{data.practiceAccuracy}% accuracy</p>
            <p className="t-body-sm mt-1 text-content-secondary">Last 50 questions across all subjects.</p>
          </div>
          <Button variant="secondary" size="md" className="mt-auto w-fit">
            <Link to="/practice">Practice now</Link>
          </Button>
        </Surface>
      </motion.div>

      {/* 5 — Secondary tools: quiet row, deliberately de-emphasised. */}
      <motion.section variants={staggerChild} aria-labelledby="tools-h">
        <h2 id="tools-h" className="t-overline mb-3 text-content-tertiary">Tools</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { icon: Sigma, label: "Formulas", to: "/formulas" },
            { icon: NotebookPen, label: "Notes", to: "/notes" },
            { icon: HeartPulse, label: "Anatomy", to: "/anatomy" },
            { icon: Trophy, label: "Competitive", to: "/competitive" },
          ].map((t) => (
            <li key={t.label}>
              <Link
                to={t.to}
                className="flex min-h-[52px] items-center gap-2.5 rounded-md border border-line-subtle px-3.5 t-body-sm text-content-secondary transition-colors duration-fast hover:border-line hover:bg-surface-interactive/60 hover:text-content"
              >
                <t.icon className="h-[18px] w-[18px] shrink-0 stroke-[1.75]" aria-hidden />
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </motion.section>
    </motion.div>
  );
}

function SectionHead({ id, title, to, linkLabel }: { id: string; title: string; to: string; linkLabel: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 id={id} className="t-section">{title}</h2>
      <Link to={to} className="t-label rounded-sm text-content-secondary transition-colors duration-fast hover:text-content">
        {linkLabel}
      </Link>
    </div>
  );
}
