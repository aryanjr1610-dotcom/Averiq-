import * as React from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

import { cn } from '@/lib/cn'

type DigitDirection = 'dynamic' | 'up' | 'down'

export interface AnimateDigitsProps {
  value: string
  gap?: number
  className?: string
  digitClassName?: string
  direction?: DigitDirection
  enterY?: number
  enterBlur?: number
  enterScale?: number
}

function DigitCell({
  value,
  index,
  direction,
  enterY,
  enterBlur,
  enterScale,
  className,
}: {
  value: string
  index: number
  direction: DigitDirection
  enterY: number
  enterBlur: number
  enterScale: number
  className?: string
}) {
  const reduceMotion = useReducedMotion()
  const previous = React.useRef(value)
  const previousNumber = Number(previous.current)
  const nextNumber = Number(value)
  const inferred = direction === 'up' ? 1 : direction === 'down' ? -1 : nextNumber >= previousNumber ? 1 : -1

  React.useEffect(() => {
    previous.current = value
  }, [value])

  if (!/\d/.test(value) || reduceMotion) {
    return <span className={cn('animate-digit-cell animate-digit-static', className)} aria-hidden="true">{value}</span>
  }

  return (
    <span className={cn('animate-digit-cell', className)} aria-hidden="true">
      <span className="animate-digit-sizer">8</span>
      <AnimatePresence initial={false} custom={inferred} mode="popLayout">
        <motion.span
          key={`${index}-${value}`}
          custom={inferred}
          className="animate-digit-value"
          initial={{
            y: inferred > 0 ? enterY : -enterY,
            opacity: 0,
            scale: enterScale,
            filter: `blur(${enterBlur}px)`,
          }}
          animate={{ y: 0, opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{
            y: inferred > 0 ? -enterY : enterY,
            opacity: 0,
            scale: 0.82,
            filter: `blur(${Math.max(6, enterBlur * 0.34)}px)`,
          }}
          transition={{ type: 'spring', stiffness: 190, damping: 20, mass: 0.75 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export function AnimateDigits({
  value,
  gap = 2,
  className,
  digitClassName,
  direction = 'dynamic',
  enterY = 22,
  enterBlur = 16,
  enterScale = 0.82,
}: AnimateDigitsProps) {
  const characters = React.useMemo(() => Array.from(value), [value])

  return (
    <span className={cn('animate-digits', className)} style={{ gap }} aria-label={value}>
      {characters.map((character, index) => (
        <DigitCell
          key={index}
          value={character}
          index={index}
          direction={direction}
          enterY={enterY}
          enterBlur={enterBlur}
          enterScale={enterScale}
          className={digitClassName}
        />
      ))}
    </span>
  )
}
