import * as React from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/cn'

export interface MotionSlideMenuItem {
  id: string
  label: string
  icon?: React.ReactNode
  href?: string
  children?: MotionSlideMenuItem[]
  disabled?: boolean
  variant?: 'default' | 'destructive'
  onSelect?: (item: MotionSlideMenuItem) => void
  target?: React.HTMLAttributeAnchorTarget
  rel?: string
  className?: string
}

export interface MotionSlideMenuProps {
  items: MotionSlideMenuItem[]
  onItemSelect?: (item: MotionSlideMenuItem) => void
  path?: string[]
  defaultPath?: string[]
  onPathChange?: (path: string[]) => void
  backLabel?: string
  rootLabel?: string
  springDuration?: number
  springBounce?: number
  itemClassName?: string
  maxHeight?: React.CSSProperties['maxHeight']
  className?: string
}

function resolveLevel(items: MotionSlideMenuItem[], path: string[]) {
  let level = items
  let active: MotionSlideMenuItem | null = null
  for (const id of path) {
    const next = level.find((item) => item.id === id && item.children?.length)
    if (!next) break
    active = next
    level = next.children ?? []
  }
  return { level, active }
}

export function MotionSlideMenu({
  items,
  onItemSelect,
  path,
  defaultPath = [],
  onPathChange,
  backLabel = 'Back to',
  rootLabel = 'main menu',
  springDuration = 0.28,
  springBounce = 0,
  itemClassName,
  maxHeight = 'min(32rem, calc(100dvh - 2rem))',
  className,
}: MotionSlideMenuProps) {
  const reducedMotion = useReducedMotion()
  const [internalPath, setInternalPath] = React.useState(defaultPath)
  const [direction, setDirection] = React.useState<1 | -1>(1)
  const currentPath = path ?? internalPath
  const { level, active } = React.useMemo(() => resolveLevel(items, currentPath), [items, currentPath])

  const setPath = (next: string[], nextDirection: 1 | -1) => {
    setDirection(nextDirection)
    if (path === undefined) setInternalPath(next)
    onPathChange?.(next)
  }

  const openCategory = (item: MotionSlideMenuItem) => {
    if (item.disabled) return
    setPath([...currentPath, item.id], 1)
  }

  const goBack = () => {
    if (currentPath.length === 0) return
    setPath(currentPath.slice(0, -1), -1)
  }

  const selectLeaf = (item: MotionSlideMenuItem) => {
    if (item.disabled) return
    item.onSelect?.(item)
    onItemSelect?.(item)
  }

  const transition = reducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, duration: springDuration, bounce: springBounce }

  return (
    <nav className={cn('motion-slide-menu', className)} aria-label={active?.label ?? rootLabel}>
      <motion.div className="motion-slide-menu__frame" layout transition={transition} style={{ maxHeight }}>
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <motion.div
            key={currentPath.join('/') || 'root'}
            custom={direction}
            className="motion-slide-menu__panel"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: direction > 0 ? '60%' : '-60%', y: 8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: direction > 0 ? '-60%' : '60%', y: 4 }}
            transition={transition}
          >
            {currentPath.length > 0 ? (
              <button type="button" className="motion-slide-menu__back" onClick={goBack} aria-label={`${backLabel} ${currentPath.length > 1 ? 'previous category' : rootLabel}`}>
                <motion.span className="motion-slide-menu__icon-slot" layoutId="motion-slide-menu-icon">
                  <ChevronLeft size={17} strokeWidth={1.9} aria-hidden="true" />
                </motion.span>
                <motion.span layoutId="motion-slide-menu-title" className="motion-slide-menu__title">{active?.label ?? 'Back'}</motion.span>
              </button>
            ) : (
              <div className="motion-slide-menu__root-title">Explore Averiq</div>
            )}

            <div className={cn('motion-slide-menu__items', currentPath.length > 0 && 'motion-slide-menu__items--nested')}>
              {level.map((item) => {
                const hasChildren = Boolean(item.children?.length)
                const content = (
                  <>
                    <span className="motion-slide-menu__leading">{item.icon}</span>
                    <span className="motion-slide-menu__label">{item.label}</span>
                    {hasChildren ? <ChevronRight className="motion-slide-menu__chevron" size={16} strokeWidth={1.8} aria-hidden="true" /> : null}
                  </>
                )
                const classes = cn(
                  'motion-slide-menu__item',
                  item.variant === 'destructive' && 'motion-slide-menu__item--destructive',
                  item.disabled && 'motion-slide-menu__item--disabled',
                  itemClassName,
                  item.className,
                )

                if (hasChildren) {
                  return (
                    <button key={item.id} type="button" className={classes} disabled={item.disabled} onClick={() => openCategory(item)}>
                      {content}
                    </button>
                  )
                }

                if (item.href) {
                  return (
                    <a key={item.id} href={item.href} target={item.target} rel={item.rel} aria-disabled={item.disabled || undefined} className={classes} onClick={(event) => {
                      if (item.disabled) { event.preventDefault(); return }
                      selectLeaf(item)
                    }}>
                      {content}
                    </a>
                  )
                }

                return (
                  <button key={item.id} type="button" className={classes} disabled={item.disabled} onClick={() => selectLeaf(item)}>
                    {content}
                  </button>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </nav>
  )
}
