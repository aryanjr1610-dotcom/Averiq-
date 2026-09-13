import * as React from 'react'

import { cn } from '@/lib/cn'

type MeteorStyle = React.CSSProperties & {
  '--meteor-angle': string
  '--meteor-delay': string
  '--meteor-duration': string
  '--meteor-length': string
  '--meteor-opacity': number
}

export interface MeteorsProps {
  number?: number
  minDelay?: number
  maxDelay?: number
  minDuration?: number
  maxDuration?: number
  angle?: number
  className?: string
  seed?: number
}

function seededRandom(seed: number) {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Magic UI-style meteor field, tuned for Averiq's Living Nature sky. */
export function Meteors({
  number = 4,
  minDelay = 9,
  maxDelay = 42,
  minDuration = 0.75,
  maxDuration = 1.35,
  angle = 218,
  className,
  seed = 0x41e21,
}: MeteorsProps) {
  const styles = React.useMemo<MeteorStyle[]>(() => {
    const random = seededRandom(seed)
    return Array.from({ length: number }, () => {
      const duration = minDuration + random() * Math.max(0.05, maxDuration - minDuration)
      const delay = minDelay + random() * Math.max(0.1, maxDelay - minDelay)
      return {
        '--meteor-angle': `${-angle}deg`,
        '--meteor-delay': `${delay.toFixed(2)}s`,
        '--meteor-duration': `${duration.toFixed(2)}s`,
        '--meteor-length': `${Math.round(86 + random() * 94)}px`,
        '--meteor-opacity': 0.58 + random() * 0.34,
        top: `${Math.round(4 + random() * 42)}%`,
        left: `${Math.round(18 + random() * 82)}%`,
      }
    })
  }, [angle, maxDelay, maxDuration, minDelay, minDuration, number, seed])

  return (
    <div className={cn('magic-meteors', className)} aria-hidden="true">
      {styles.map((style, index) => (
        <span key={`${seed}-${index}`} className="magic-meteor" style={style}>
          <span className="magic-meteor__tail" />
        </span>
      ))}
    </div>
  )
}
