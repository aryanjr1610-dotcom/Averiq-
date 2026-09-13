import * as React from 'react'

import { cn } from '@/lib/cn'

export interface AndroidMockupProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number
  aspectRatio?: number
  src?: string
  videoSrc?: string
  screenLabel?: string
  children?: React.ReactNode
}

export function AndroidMockup({
  width = 230,
  aspectRatio = 433 / 882,
  src,
  videoSrc,
  screenLabel = 'Averiq mobile preview',
  children,
  className,
  style,
  ...props
}: AndroidMockupProps) {
  return (
    <div
      className={cn('magic-android', className)}
      style={{ width, aspectRatio: `${aspectRatio}`, ...style }}
      role="img"
      aria-label={screenLabel}
      {...props}
    >
      <span className="magic-android__button magic-android__button--power" aria-hidden="true" />
      <span className="magic-android__button magic-android__button--volume" aria-hidden="true" />
      <div className="magic-android__frame">
        <div className="magic-android__screen">
          {videoSrc ? (
            <video src={videoSrc} autoPlay loop muted playsInline className="magic-android__media" />
          ) : src ? (
            <img src={src} alt="" className="magic-android__media" />
          ) : children}
          <span className="magic-android__camera" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
