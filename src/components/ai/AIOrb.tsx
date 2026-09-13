import { motion, useReducedMotion } from 'framer-motion'
import { getAIStateMotion, type AIState } from './aiState'

export type AIOrbProps = {
  state?: AIState
  size?: number
  className?: string
}

/**
 * Compact Living Nature AI presence. It shares the tutor state vocabulary but
 * keeps the motion ambient and low-energy so it never competes with learning.
 */
export function AIOrb({ state = 'idle', size = 36, className = '' }: AIOrbProps) {
  const reduceMotion = useReducedMotion()
  const preset = getAIStateMotion(state)

  const rootAnimate = reduceMotion
    ? { scale: 1, x: 0 }
    : state === 'error'
      ? { scale: 1, x: [0, -2, 2, 0] }
      : state === 'idle'
        ? { scale: [preset.scale, preset.scale * 1.025, preset.scale], x: 0 }
        : { scale: preset.scale, x: 0 }

  const rootTransition = reduceMotion
    ? { duration: 0 }
    : state === 'error'
      ? { duration: 0.18 }
      : state === 'idle'
        ? { duration: 5.5, ease: 'easeInOut' as const, repeat: Number.POSITIVE_INFINITY }
        : { type: 'spring' as const, stiffness: 160, damping: 18 }

  return (
    <motion.span
      aria-hidden="true"
      animate={rootAnimate}
      className={`averiq-ai-orb ${className}`.trim()}
      data-state={state}
      style={{
        width: size,
        height: size,
        ['--ai-orb-speed' as string]: `${Math.max(5.2, 12 / preset.speed)}s`,
        ['--ai-orb-glow' as string]: preset.glow,
        ['--ai-orb-saturation' as string]: preset.saturation,
        ['--ai-orb-hue' as string]: `${preset.hueRotate}deg`,
      }}
      transition={rootTransition}
    >
      <span className="averiq-ai-orb__mesh" />
      <span className="averiq-ai-orb__sheen" />
      <span className="averiq-ai-orb__rim" />
    </motion.span>
  )
}

export default AIOrb
