import * as React from 'react'
import { motion } from 'framer-motion'

import { cn } from '@/lib/cn'

export interface AnimatedBeamProps {
  className?: string
  containerRef: React.RefObject<HTMLElement | null>
  fromRef: React.RefObject<HTMLElement | null>
  toRef: React.RefObject<HTMLElement | null>
  curvature?: number
  reverse?: boolean
  pathColor?: string
  pathWidth?: number
  pathOpacity?: number
  gradientStartColor?: string
  gradientStopColor?: string
  delay?: number
  duration?: number
  repeat?: number
  repeatDelay?: number
  startXOffset?: number
  startYOffset?: number
  endXOffset?: number
  endYOffset?: number
  reducedMotion?: boolean
}

/** Magic UI beam adapted to the Averiq token system and Framer Motion. */
export function AnimatedBeam({
  className,
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  duration = 4.8,
  delay = 0,
  pathColor = 'rgb(var(--border-default))',
  pathWidth = 1.5,
  pathOpacity = 0.18,
  gradientStartColor = 'rgb(var(--accent))',
  gradientStopColor = 'rgb(var(--subject-accent))',
  repeat = Infinity,
  repeatDelay = 0.55,
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
  reducedMotion = false,
}: AnimatedBeamProps) {
  const id = React.useId().replace(/:/g, '')
  const [pathD, setPathD] = React.useState('')
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 })

  React.useLayoutEffect(() => {
    const container = containerRef.current
    const from = fromRef.current
    const to = toRef.current
    if (!container || !from || !to) return

    const updatePath = () => {
      const containerRect = container.getBoundingClientRect()
      const rectA = from.getBoundingClientRect()
      const rectB = to.getBoundingClientRect()
      const width = Math.max(1, containerRect.width)
      const height = Math.max(1, containerRect.height)
      setDimensions({ width, height })

      const startX = rectA.left - containerRect.left + rectA.width / 2 + startXOffset
      const startY = rectA.top - containerRect.top + rectA.height / 2 + startYOffset
      const endX = rectB.left - containerRect.left + rectB.width / 2 + endXOffset
      const endY = rectB.top - containerRect.top + rectB.height / 2 + endYOffset
      const midX = (startX + endX) / 2
      const controlY = Math.min(startY, endY) - curvature
      setPathD(`M ${startX},${startY} Q ${midX},${controlY} ${endX},${endY}`)
    }

    updatePath()
    const observer = new ResizeObserver(updatePath)
    observer.observe(container)
    observer.observe(from)
    observer.observe(to)
    window.addEventListener('resize', updatePath, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updatePath)
    }
  }, [containerRef, curvature, endXOffset, endYOffset, fromRef, startXOffset, startYOffset, toRef])

  if (!pathD) return null

  const coords = reverse
    ? { x1: ['90%', '-10%'], x2: ['100%', '0%'] }
    : { x1: ['10%', '110%'], x2: ['0%', '100%'] }

  return (
    <svg
      aria-hidden="true"
      fill="none"
      width={dimensions.width}
      height={dimensions.height}
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      className={cn('magic-beam pointer-events-none absolute inset-0', className)}
    >
      <path d={pathD} stroke={pathColor} strokeWidth={pathWidth} strokeOpacity={pathOpacity} strokeLinecap="round" />
      <path d={pathD} strokeWidth={pathWidth} stroke={`url(#${id})`} strokeLinecap="round" />
      <defs>
        <motion.linearGradient
          id={id}
          gradientUnits="userSpaceOnUse"
          initial={{ x1: '0%', x2: '0%', y1: '0%', y2: '0%' }}
          animate={reducedMotion ? { x1: '0%', x2: '100%', y1: '0%', y2: '0%' } : { x1: coords.x1, x2: coords.x2, y1: ['0%', '0%'], y2: ['0%', '0%'] }}
          transition={reducedMotion ? { duration: 0 } : { delay, duration, ease: [0.16, 1, 0.3, 1], repeat, repeatDelay }}
        >
          <stop stopColor={gradientStartColor} stopOpacity="0" />
          <stop offset="18%" stopColor={gradientStartColor} />
          <stop offset="48%" stopColor={gradientStopColor} />
          <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
        </motion.linearGradient>
      </defs>
    </svg>
  )
}
