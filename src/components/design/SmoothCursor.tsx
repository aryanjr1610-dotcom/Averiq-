import * as React from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

const DESKTOP_POINTER_QUERY = '(any-hover: hover) and (any-pointer: fine)'

export interface SmoothCursorProps {
  enabled?: boolean
}

function CursorGlyph() {
  return (
    <svg width="28" height="31" viewBox="0 0 28 31" fill="none" aria-hidden="true">
      <path d="M3.4 2.8 23.1 17.3c1.2.9.7 2.8-.8 3l-7.7 1.1-3.6 6.9c-.7 1.4-2.8 1.1-3.1-.4L1.2 5.1C.8 3.5 2.1 1.9 3.4 2.8Z" fill="rgb(var(--text-primary))" fillOpacity=".92" />
      <path d="M3.4 2.8 23.1 17.3c1.2.9.7 2.8-.8 3l-7.7 1.1-3.6 6.9c-.7 1.4-2.8 1.1-3.1-.4L1.2 5.1C.8 3.5 2.1 1.9 3.4 2.8Z" stroke="rgb(var(--accent))" strokeOpacity=".55" strokeWidth="1.1" />
    </svg>
  )
}

export function SmoothCursor({ enabled = true }: SmoothCursorProps) {
  const [supported, setSupported] = React.useState(false)
  const [visible, setVisible] = React.useState(false)
  const targetX = useMotionValue(-80)
  const targetY = useMotionValue(-80)
  const x = useSpring(targetX, { damping: 42, stiffness: 420, mass: 0.7, restDelta: 0.001 })
  const y = useSpring(targetY, { damping: 42, stiffness: 420, mass: 0.7, restDelta: 0.001 })
  const rotate = useSpring(0, { damping: 56, stiffness: 310, mass: 0.8 })
  const scale = useSpring(1, { damping: 34, stiffness: 470, mass: 0.6 })
  const previous = React.useRef({ x: 0, y: 0, angle: 0 })

  React.useEffect(() => {
    const query = window.matchMedia(DESKTOP_POINTER_QUERY)
    const update = () => setSupported(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  React.useEffect(() => {
    if (!enabled || !supported) return
    const body = document.body
    const previousCursor = body.style.cursor
    body.classList.add('magic-smooth-cursor-enabled')
    body.style.cursor = 'none'

    let raf = 0
    let queued: PointerEvent | null = null
    const commit = () => {
      raf = 0
      const event = queued
      queued = null
      if (!event || event.pointerType === 'touch') return
      setVisible(true)
      targetX.set(event.clientX)
      targetY.set(event.clientY)
      const dx = event.clientX - previous.current.x
      const dy = event.clientY - previous.current.y
      const speed = Math.hypot(dx, dy)
      if (speed > 1.4) {
        const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 86
        let delta = angle - previous.current.angle
        if (delta > 180) delta -= 360
        if (delta < -180) delta += 360
        previous.current.angle += delta
        rotate.set(previous.current.angle)
        scale.set(0.94)
        window.setTimeout(() => scale.set(1), 110)
      }
      previous.current.x = event.clientX
      previous.current.y = event.clientY
    }
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      queued = event
      if (!raf) raf = requestAnimationFrame(commit)
    }
    const onLeave = () => setVisible(false)

    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('mouseleave', onLeave)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      body.classList.remove('magic-smooth-cursor-enabled')
      body.style.cursor = previousCursor
      setVisible(false)
    }
  }, [enabled, rotate, scale, supported, targetX, targetY])

  if (!enabled || !supported) return null

  return (
    <motion.div
      className="magic-smooth-cursor"
      style={{ x, y, rotate, scale }}
      animate={{ opacity: visible ? 1 : 0 }}
      initial={false}
      transition={{ duration: 0.14 }}
      aria-hidden="true"
    >
      <span className="magic-smooth-cursor__halo" />
      <CursorGlyph />
    </motion.div>
  )
}
