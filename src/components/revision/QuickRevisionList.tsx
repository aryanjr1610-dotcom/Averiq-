/** Quick Revision: densest surface in the app. Same tokens, tighter rhythm. */
export function QuickRevisionList({ points }: { points: Array<{ id: string; text: string; tag?: string }> }) {
  return (
    <ul className="mx-auto w-full max-w-prose divide-y divide-edge-subtle border-y border-edge-subtle">
      {points.map((p) => (
        <li key={p.id} className="flex gap-3 py-2.5">
          <span aria-hidden className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-ink-tertiary" />
          <p className="text-body-sm leading-[1.5] text-ink">
            {p.text}
            {p.tag && <span className="ml-2 rounded-xs border border-edge px-1.5 py-[1px] text-caption text-ink-tertiary">{p.tag}</span>}
          </p>
        </li>
      ))}
    </ul>
  );
}
