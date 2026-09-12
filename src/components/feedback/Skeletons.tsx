import { type ReactNode } from "react";

/** Primitive: all skeletons compose from this. */
export function Bone({ w = "100%", h = 12, r = "var(--radius-xs)", className = "" }:
  { w?: string | number; h?: string | number; r?: string; className?: string }) {
  return <span aria-hidden className={`skeleton block ${className}`} style={{ width: w, height: h, borderRadius: r }} />;
}

function Live({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <Live label="Loading your dashboard">
      <div className="flex flex-col gap-section">
        <div className="flex items-baseline justify-between gap-6">
          <Bone w={220} h={26} r="var(--radius-sm)" />
          <Bone w={130} h={14} />
        </div>
        {/* hero — matches ContinueLearningHero geometry exactly */}
        <div className="rounded-xl border border-line-subtle bg-surface p-5 sm:p-8">
          <Bone w={140} h={10} className="mb-5" />
          <Bone w={100} h={13} className="mb-3" />
          <Bone w="72%" h={34} r="var(--radius-sm)" className="mb-3" />
          <Bone w="52%" h={15} className="mb-8" />
          <Bone w="100%" h={6} r="var(--radius-full)" className="max-w-md" />
        </div>
        <div className="grid gap-block lg:grid-cols-12">
          <div className="flex flex-col gap-2 lg:col-span-7">
            <Bone w={80} h={18} className="mb-1" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-line-subtle bg-surface-raised p-4">
                <Bone w={`${62 - i * 8}%`} h={14} className="mb-2" />
                <Bone w={`${42 - i * 5}%`} h={11} />
              </div>
            ))}
          </div>
          <div className="lg:col-span-5">
            <Bone w={90} h={18} className="mb-4" />
            <div className="grid grid-cols-2 gap-x-6 gap-y-6 rounded-lg border border-line-subtle bg-surface p-5 sm:p-6">
              {[0, 1, 2, 3].map((i) => (
                <div key={i}>
                  <Bone w={72} h={28} r="var(--radius-sm)" className="mb-2" />
                  <Bone w={54} h={11} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Live>
  );
}

export function ReaderSkeleton() {
  return (
    <Live label="Loading chapter">
      <div className="mx-auto max-w-reading px-page-x">
        <Bone w={90} h={10} className="mb-4" />
        <Bone w="80%" h={40} r="var(--radius-sm)" className="mb-10" />
        {[0, 1, 2].map((block) => (
          <div key={block} className="mb-10">
            <Bone w="46%" h={22} r="var(--radius-sm)" className="mb-5" />
            {[100, 97, 99, 64].map((w, i) => (
              <Bone key={i} w={`${w}%`} h={13} className="mb-3.5" />
            ))}
            {block === 1 && <Bone w="100%" h={200} r="var(--radius-lg)" className="mt-6" />}
          </div>
        ))}
      </div>
    </Live>
  );
}

export function ListSkeleton({ rows = 6, withMeta = true }: { rows?: number; withMeta?: boolean }) {
  return (
    <Live label="Loading">
      <ul className="flex flex-col gap-2">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex items-center gap-4 rounded-lg border border-line-subtle bg-surface-raised p-4">
            <Bone w={36} h={36} r="var(--radius-sm)" />
            <div className="min-w-0 flex-1">
              <Bone w={`${68 - (i % 3) * 9}%`} h={13} className="mb-2" />
              {withMeta && <Bone w={`${34 - (i % 3) * 4}%`} h={10} />}
            </div>
            <Bone w={52} h={11} />
          </li>
        ))}
      </ul>
    </Live>
  );
}

export function PracticeSkeleton() {
  return (
    <Live label="Loading question">
      <div className="mx-auto max-w-2xl">
        <Bone w={130} h={10} className="mb-6" />
        <Bone w="100%" h={15} className="mb-3" />
        <Bone w="88%" h={15} className="mb-3" />
        <Bone w="46%" h={15} className="mb-8" />
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <Bone key={i} w="100%" h={62} r="var(--radius-md)" />
          ))}
        </div>
      </div>
    </Live>
  );
}
