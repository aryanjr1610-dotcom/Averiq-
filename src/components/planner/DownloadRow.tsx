'use client';
import { Download, Check, Trash2 } from 'lucide-react';

export function DownloadRow({
  title, sizeLabel, state, onDownload, onRemove, progress = 0,
}: {
  title: string;
  sizeLabel: string;
  state: 'available' | 'downloading' | 'downloaded';
  onDownload: () => void;
  onRemove: () => void;
  progress?: number;
}) {
  return (
    <div className="flex min-h-[56px] items-center gap-3 border-t border-edge-subtle px-4 py-2.5 first:border-t-0">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body text-ink">{title}</span>
        <span className="mt-0.5 block text-caption text-ink-secondary">
          {state === 'downloading' ? `Downloading… ${Math.round(progress)}%` : sizeLabel}
        </span>
      </span>

      {state === 'downloaded' ? (
        <>
          <span className="flex shrink-0 items-center gap-1.5 text-caption text-success">
            <Check size={14} strokeWidth={2.25} aria-hidden /> Offline
          </span>
          <button onClick={onRemove} aria-label={`Remove ${title}`} className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-tertiary transition-colors duration-fast hover:bg-surface-2 hover:text-danger">
            <Trash2 size={16} strokeWidth={1.75} />
          </button>
        </>
      ) : state === 'downloading' ? (
        <span className="h-1 w-20 shrink-0 overflow-hidden rounded-full bg-surface-3">
          <span className="block h-full origin-left bg-accent" style={{ transform: `scaleX(${progress / 100})`, width: '100%' }} />
        </span>
      ) : (
        <button onClick={onDownload} aria-label={`Download ${title}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-secondary transition-colors duration-fast hover:bg-surface-2 hover:text-ink active:scale-[.96]">
          <Download size={16} strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}
