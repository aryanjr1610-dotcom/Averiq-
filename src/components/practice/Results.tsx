import Link from 'next/link';
import { Check, X, Minus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export type Breakdown = { topic: string; correct: number; total: number };

export function PracticeResults({
  score, total, timeSeconds, breakdown, reviewHref, retryHref,
}: {
  score: number;
  total: number;
  timeSeconds: number;
  breakdown: Breakdown[];
  reviewHref: string;
  retryHref: string;
}) {
  const pct = total ? Math.round((score / total) * 100) : 0;
  const weak = breakdown.filter((b) => b.total > 0 && b.correct / b.total < 0.6);
  const mins = Math.floor(timeSeconds / 60);

  return (
    <div className="mx-auto w-full max-w-[720px] px-5 py-10 md:px-8">
      <p className="text-label text-ink-secondary">Practice complete</p>

      <div className="mt-4 flex flex-wrap items-end gap-x-10 gap-y-4">
        <div>
          <p className="text-metric text-ink">{score}<span className="text-ink-tertiary">/{total}</span></p>
          <p className="mt-1 text-caption text-ink-secondary">Correct</p>
        </div>
        <div>
          <p className="text-metric tabular text-ink">{pct}%</p>
          <p className="mt-1 text-caption text-ink-secondary">Accuracy</p>
        </div>
        <div>
          <p className="text-metric tabular text-ink">{mins}<span className="text-ink-tertiary"> min</span></p>
          <p className="mt-1 text-caption text-ink-secondary">Time taken</p>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-section mb-3 text-ink">By topic</h2>
        <div className="overflow-hidden rounded-lg border border-edge-subtle bg-surface-1">
          {breakdown.map((b, i) => {
            const ratio = b.total ? b.correct / b.total : 0;
            const Icon = ratio >= 0.8 ? Check : ratio >= 0.6 ? Minus : X;
            const tone = ratio >= 0.8 ? 'text-success' : ratio >= 0.6 ? 'text-warning' : 'text-danger';
            const word = ratio >= 0.8 ? 'Strong' : ratio >= 0.6 ? 'Mixed' : 'Needs work';
            return (
              <div key={b.topic} className={'flex min-h-[52px] items-center gap-3 px-4 py-2.5 ' + (i > 0 ? 'border-t border-edge-subtle' : '')}>
                <Icon size={15} strokeWidth={2} className={'shrink-0 ' + tone} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-body-sm text-ink">{b.topic}</span>
                {/* label, not just colour */}
                <span className={'shrink-0 text-caption ' + tone}>{word}</span>
                <span className="w-12 shrink-0 text-right tabular text-caption text-ink-secondary">{b.correct}/{b.total}</span>
              </div>
            );
          })}
        </div>
      </section>

      {weak.length > 0 && (
        <section className="mt-8 rounded-lg border border-edge-subtle bg-surface-1 p-5">
          <h2 className="text-card-title text-ink">Where to go next</h2>
          <p className="mt-1.5 text-body-sm text-ink-secondary">
            {weak.map((w) => w.topic).slice(0, 3).join(', ')} came out weakest. A short revision pass will move these fastest.
          </p>
        </section>
      )}

      <div className="mt-8 flex flex-wrap gap-2">
        <Link href={reviewHref}>
          <Button variant="primary">Review answers</Button>
        </Link>
        <Link href={retryHref}>
          <Button variant="secondary">Practice again</Button>
        </Link>
      </div>
    </div>
  );
}
