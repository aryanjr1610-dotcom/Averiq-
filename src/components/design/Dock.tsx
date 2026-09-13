import * as React from 'react'
import { motion, type MotionValue, useMotionValue, useSpring, useTransform } from 'framer-motion'

import { cn } from '@/lib/cn'

export interface DockProps extends React.HTMLAttributes<HTMLDivElement> {
  iconSize?: number
  iconMagnification?: number
  disableMagnification?: boolean
  iconDistance?: number
  direction?: 'top' | 'middle' | 'bottom'
  children: React.ReactNode
}

export interface DockIconProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  size?: number
  magnification?: number
  disableMagnification?: boolean
  distance?: number
  mouseX?: MotionValue<number>
  children?: React.ReactNode
}

export const DockIcon = React.forwardRef<HTMLDivElement, DockIconProps>(function DockIcon({
  size = 38,
  magnification = 55,
  disableMagnification = false,
  distance = 126,
  mouseX,
  className,
  children,
  ...props
}, forwardedRef) {
  const localRef = React.useRef<HTMLDivElement | null>(null)
  const fallback = useMotionValue(Number.POSITIVE_INFINITY)
  const activeMouseX = mouseX ?? fallback

  React.useImperativeHandle(forwardedRef, () => localRef.current as HTMLDivElement)

  const distanceFromIcon = useTransform(activeMouseX, (value: number) => {
    const bounds = localRef.current?.getBoundingClientRect()
    if (!bounds || !Number.isFinite(value)) return Number.POSITIVE_INFINITY
    return value - bounds.x - bounds.width / 2
  })
  const target = disableMagnification ? size : magnification
  const sizeTransform = useTransform(distanceFromIcon, [-distance, 0, distance], [size, target, size])
  const springSize = useSpring(sizeTransform, { mass: 0.12, stiffness: 170, damping: 16 })

  return (
    <motion.div ref={localRef} className={cn('magic-dock-icon', className)} style={{ width: springSize, height: springSize }} {...props}>
      <span className="magic-dock-icon__inner">{children}</span>
    </motion.div>
  )
})

export const Dock = React.forwardRef<HTMLDivElement, DockProps>(function Dock({
  className,
  children,
  iconSize = 38,
  iconMagnification = 55,
  disableMagnification = false,
  iconDistance = 126,
  direction = 'middle',
  ...props
}, ref) {
  const mouseX = useMotionValue(Number.POSITIVE_INFINITY)

  return (
    <motion.div
      ref={ref}
      onMouseMove={(event) => mouseX.set(event.pageX)}
      onMouseLeave={() => mouseX.set(Number.POSITIVE_INFINITY)}
      className={cn('magic-dock', `magic-dock--${direction}`, className)}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement<DockIconProps>(child) || child.type !== DockIcon) return child
        return React.cloneElement(child, {
          ...child.props,
          mouseX,
          size: iconSize,
          magnification: iconMagnification,
          disableMagnification,
          distance: iconDistance,
        })
      })}
    </motion.div>
  )
})
