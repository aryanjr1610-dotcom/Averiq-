'use client';
import * as React from 'react';

export type Stream = 'pcm' | 'pcb' | 'pcmb' | 'commerce' | 'humanities' | 'foundation';
export type Subject = 'physics' | 'maths' | 'chemistry' | 'biology' | 'english' | 'history' | 'economics';
export type SurfaceMode = 'app' | 'reading' | 'immersive';

/** Wrap the app once. No per-page background components. */
export function Atmosphere({
  stream = 'foundation',
  subject,
  surface = 'app',
  lowPowerMode = false,
  children,
}: {
  stream?: Stream;
  subject?: Subject;
  surface?: SurfaceMode;
  lowPowerMode?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="averiq-atmos"
      data-stream={stream}
      data-subject={subject}
      data-surface={surface}
      data-low-power={lowPowerMode ? 'true' : undefined}
    >
      <div className="averiq-atmos__layers" aria-hidden />
      <div className="averiq-atmos__content">{children}</div>
    </div>
  );
}
