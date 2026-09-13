import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { cn } from '@/lib/cn'

export interface AnimatedListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  delay?: number
  reducedMotion?: boolean
  maxItems?: number
}

export function AnimatedList({ children, className, delay = 680, reducedMotion = false, maxItems = 5, ...props }: AnimatedListProps) {
  const childrenArray = React.useMemo(() => React.Children.toArray(children).slice(0, maxItems), [children, maxItems])
  const [index, setIndex] = React.useState(reducedMotion ? childrenArray.length - 1 : 0)

  React.useEffect(() => {
    if (reducedMotion) {
      setIndex(Math.max(0, childrenArray.length - 1))
      return
    }
    setIndex(0)
  }, [childrenArray.length, reducedMotion])

  React.useEffect(() => {
    if (reducedMotion || childrenArray.length <= 1 || index >= childrenArray.length - 1) return
    const timeout = window.setTimeout(() => setIndex((value) => Math.min(childrenArray.length - 1, value + 1)), delay)
    return () => window.clearTimeout(timeout)
  }, [childrenArray.length, delay, index, reducedMotion])

  const visible = childrenArray.slice(0, index + 1).reverse()

  return (
    <div className={cn('magic-animated-list', className)} {...props}>
      <AnimatePresence initial={false}>
        {visible.map((item, itemIndex) => (
          <motion.div
            key={(item as React.ReactElement).key ?? itemIndex}
            layout={!reducedMotion}
            initial={reducedMotion ? false : { opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -8, scale: 0.97 }}
            transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 330, damping: 32, mass: 0.7 }}
            className="magic-animated-list__item"
          >
            {item}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
