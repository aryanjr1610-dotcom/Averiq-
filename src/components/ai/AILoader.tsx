import { motion, useAnimationFrame, useReducedMotion } from 'framer-motion'
import { useRef, useState } from 'react'

export const AI_LOADER_CYCLE_SECONDS = 1.2

type Variant = 'dots' | 'bar' | 'grid'

export type AILoaderProps = {
  variant?: Variant
  label?: string
  showElapsed?: boolean
  className?: string
}

const GRID_DELAYS = [0, 1, 2, 1, 2, 3, 2, 3, 4]

function Elapsed() {
  const startRef = useRef<number | null>(null)
  const [seconds, setSeconds] = useState(0)

  useAnimationFrame((time) => {
    const start = startRef.current ?? time
    startRef.current = start
    const next = (time - start) / 1000
    setSeconds((current) => (next.toFixed(1) === current.toFixed(1) ? current : next))
  })

  return <span className="ai-loader__elapsed">{seconds.toFixed(1)}s</span>
}

export function AILoader({ variant = 'dots', label, showElapsed = false, className = '' }: AILoaderProps) {
  const reduceMotion = Boolean(useReducedMotion())

  return (
    <span className={`ai-loader ${className}`.trim()} role="status" aria-live="polite">
      {label ? <span className="ai-loader__label">{label}</span> : null}

      {variant === 'dots' ? (
        <span className="ai-loader__dots" aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <motion.span
              key={index}
              animate={reduceMotion ? { opacity: 0.55 } : { opacity: [0.28, 1, 0.28], y: [0, -2, 0] }}
              transition={reduceMotion ? { duration: 0 } : {
                duration: AI_LOADER_CYCLE_SECONDS,
                delay: index * AI_LOADER_CYCLE_SECONDS / 6,
                ease: 'easeInOut',
                repeat: Number.POSITIVE_INFINITY,
              }}
            />
          ))}
        </span>
      ) : null}

      {variant === 'bar' ? (
        <span className="ai-loader__bar" aria-hidden="true">
          <motion.span
            animate={reduceMotion ? { x: '0%' } : { x: ['-100%', '200%'] }}
            transition={reduceMotion ? { duration: 0 } : {
              duration: AI_LOADER_CYCLE_SECONDS * 1.4,
              ease: 'easeInOut',
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
        </span>
      ) : null}

      {variant === 'grid' ? (
        <span className="ai-loader__grid" aria-hidden="true">
          {Array.from({ length: 9 }, (_, index) => (
            <motion.span
              key={index}
              animate={reduceMotion ? { opacity: 0.45 } : { opacity: [0.2, 1, 0.2] }}
              transition={reduceMotion ? { duration: 0 } : {
                duration: AI_LOADER_CYCLE_SECONDS,
                delay: (GRID_DELAYS[index] ?? 0) * AI_LOADER_CYCLE_SECONDS / 8,
                ease: 'easeInOut',
                repeat: Number.POSITIVE_INFINITY,
              }}
            />
          ))}
        </span>
      ) : null}

      {showElapsed ? <Elapsed /> : null}
      <span className="sr-only">{label ?? 'Loading'}</span>
    </span>
  )
}

export default AILoader
