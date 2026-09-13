import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

import { cn } from '@/lib/cn'

export interface AppleSwitchProps {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (value: boolean) => void
  label?: React.ReactNode
  description?: React.ReactNode
  labelSide?: 'left' | 'right'
  size?: 'sm' | 'md' | 'lg'
  tone?: 'neutral' | 'accent'
  disabled?: boolean
  className?: string
}

const SIZE = {
  sm: { track: 38, height: 22, thumb: 18, inset: 2, press: 5 },
  md: { track: 46, height: 27, thumb: 23, inset: 2, press: 6 },
  lg: { track: 54, height: 32, thumb: 28, inset: 2, press: 7 },
} as const

export function AppleSwitch({
  checked,
  defaultChecked = false,
  onCheckedChange,
  label,
  description,
  labelSide = 'right',
  size = 'md',
  tone = 'accent',
  disabled = false,
  className,
}: AppleSwitchProps) {
  const id = React.useId()
  const reducedMotion = useReducedMotion()
  const [internal, setInternal] = React.useState(defaultChecked)
  const [pressed, setPressed] = React.useState(false)
  const [dragX, setDragX] = React.useState<number | null>(null)
  const startX = React.useRef(0)
  const moved = React.useRef(false)
  const suppressClick = React.useRef(false)
  const trackRef = React.useRef<HTMLButtonElement | null>(null)
  const value = checked ?? internal
  const dimensions = SIZE[size]
  const travel = dimensions.track - dimensions.thumb - dimensions.inset * 2
  const baseX = value ? travel : 0
  const visualX = dragX ?? baseX

  const commit = React.useCallback((next: boolean) => {
    if (checked === undefined) setInternal(next)
    onCheckedChange?.(next)
  }, [checked, onCheckedChange])

  const finishPointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!pressed) return
    setPressed(false)
    try { event.currentTarget.releasePointerCapture(event.pointerId) } catch { /* already released */ }
    if (moved.current) {
      const rect = event.currentTarget.getBoundingClientRect()
      commit(event.clientX >= rect.left + rect.width / 2)
      suppressClick.current = true
    }
    setDragX(null)
  }

  const switchButton = (
    <motion.button
      ref={trackRef}
      id={id}
      type="button"
      role="switch"
      aria-checked={value}
      aria-labelledby={label ? `${id}-label` : undefined}
      aria-describedby={description ? `${id}-description` : undefined}
      aria-label={!label ? 'Toggle setting' : undefined}
      disabled={disabled}
      data-checked={value ? 'true' : 'false'}
      data-tone={tone}
      data-size={size}
      className="apple-switch__track"
      style={{ width: dimensions.track, height: dimensions.height }}
      whileTap={reducedMotion || disabled ? undefined : { scale: 0.98 }}
      onPointerDown={(event) => {
        if (disabled || event.button !== 0) return
        event.currentTarget.setPointerCapture(event.pointerId)
        startX.current = event.clientX
        moved.current = false
        setPressed(true)
      }}
      onPointerMove={(event) => {
        if (!pressed || disabled) return
        const delta = event.clientX - startX.current
        if (Math.abs(delta) > 3) moved.current = true
        const nextX = value
          ? Math.max(0, Math.min(travel, travel + delta))
          : Math.max(0, Math.min(travel, delta))
        setDragX(nextX)
      }}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onClick={() => {
        if (disabled) return
        if (suppressClick.current) {
          suppressClick.current = false
          return
        }
        commit(!value)
      }}
    >
      <motion.span
        className="apple-switch__fill"
        aria-hidden="true"
        animate={{ opacity: value ? 1 : 0.18 }}
        transition={{ duration: reducedMotion ? 0 : 0.2 }}
      />
      <motion.span
        className="apple-switch__liquid"
        aria-hidden="true"
        animate={{ opacity: pressed ? 0.34 : 0, scaleX: pressed ? 1.18 : 0.88 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      />
      <motion.span
        className="apple-switch__thumb"
        aria-hidden="true"
        animate={{
          x: visualX,
          width: pressed ? dimensions.thumb + dimensions.press : dimensions.thumb,
          filter: pressed ? 'blur(0.2px)' : 'blur(0px)',
        }}
        transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 430, damping: 30, mass: 0.62 }}
        style={{ height: dimensions.thumb, left: dimensions.inset }}
      />
    </motion.button>
  )

  if (!label && !description) return <div className={className}>{switchButton}</div>

  return (
    <div className={cn('apple-switch', labelSide === 'left' && 'apple-switch--label-left', disabled && 'apple-switch--disabled', className)}>
      {labelSide === 'right' ? switchButton : null}
      <div className="apple-switch__copy" onClick={() => { if (!disabled) commit(!value) }}>
        {label ? <span id={`${id}-label`} className="apple-switch__label">{label}</span> : null}
        {description ? <span id={`${id}-description`} className="apple-switch__description">{description}</span> : null}
      </div>
      {labelSide === 'left' ? switchButton : null}
    </div>
  )
}
