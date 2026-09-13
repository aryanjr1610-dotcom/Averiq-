import * as React from 'react'

import { cn } from '@/lib/cn'

export interface AuroraTextProps {
  children: React.ReactNode
  className?: string
  colors?: string[]
  speed?: number
  subtle?: boolean
}

export const AuroraText = React.memo(function AuroraText({
  children,
  className,
  colors = [
    'rgb(var(--accent))',
    'rgb(var(--subject-accent))',
    'rgb(var(--text-primary))',
    'rgb(var(--accent-hover))',
  ],
  speed = 0.72,
  subtle = true,
}: AuroraTextProps) {
  const gradientStyle = {
    backgroundImage: `linear-gradient(135deg, ${colors.join(', ')}, ${colors[0]})`,
    animationDuration: `${10 / Math.max(0.15, speed)}s`,
  } as React.CSSProperties

  return (
    <span className={cn('magic-aurora-text-wrap', className)}>
      <span className="sr-only">{children}</span>
      <span
        aria-hidden="true"
        className={cn('magic-aurora-text', subtle && 'magic-aurora-text--subtle')}
        style={gradientStyle}
      >
        {children}
      </span>
    </span>
  )
})
