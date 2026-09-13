import * as React from 'react'

import { cn } from '@/lib/cn'

export interface AvatarCircleItem {
  id: string
  label: string
  imageUrl?: string | null
  initials?: string
  href?: string
  tone?: string
}

export interface AvatarCirclesProps {
  className?: string
  items: AvatarCircleItem[]
  numPeople?: number
  maxVisible?: number
  size?: 'sm' | 'md'
}

function Circle({ item, size }: { item: AvatarCircleItem; size: 'sm' | 'md' }) {
  const content = item.imageUrl ? (
    <img src={item.imageUrl} alt="" loading="lazy" />
  ) : (
    <span>{item.initials ?? item.label.slice(0, 2).toUpperCase()}</span>
  )

  const className = cn('magic-avatar-circle', size === 'sm' && 'magic-avatar-circle--sm')
  const style = item.tone ? ({ '--avatar-tone': item.tone } as React.CSSProperties) : undefined

  return item.href ? (
    <a href={item.href} className={className} style={style} aria-label={item.label} title={item.label}>
      {content}
    </a>
  ) : (
    <span className={className} style={style} aria-label={item.label} title={item.label}>
      {content}
    </span>
  )
}

export function AvatarCircles({ className, items, numPeople = 0, maxVisible = 5, size = 'md' }: AvatarCirclesProps) {
  const visible = items.slice(0, maxVisible)
  const hidden = Math.max(0, items.length - visible.length) + Math.max(0, numPeople)

  return (
    <div className={cn('magic-avatar-circles', className)} aria-label="Study collection">
      {visible.map((item) => <Circle key={item.id} item={item} size={size} />)}
      {hidden > 0 ? (
        <span className={cn('magic-avatar-circle magic-avatar-circle--more', size === 'sm' && 'magic-avatar-circle--sm')} aria-label={`${hidden} more`}>
          +{hidden}
        </span>
      ) : null}
    </div>
  )
}
