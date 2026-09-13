import * as React from 'react'
import { ArrowRight } from 'lucide-react'

import { cn } from '@/lib/cn'

export interface BentoGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export interface BentoCardProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title: React.ReactNode
  description?: React.ReactNode
  eyebrow?: string
  icon?: React.ElementType
  background?: React.ReactNode
  action?: React.ReactNode
  children?: React.ReactNode
  interactive?: boolean
}

export function BentoGrid({ children, className, ...props }: BentoGridProps) {
  return <div className={cn('magic-bento-grid', className)} {...props}>{children}</div>
}

export function BentoCard({
  title,
  description,
  eyebrow,
  icon: Icon,
  background,
  action,
  children,
  interactive = true,
  className,
  ...props
}: BentoCardProps) {
  return (
    <article className={cn('magic-bento-card', interactive && 'magic-bento-card--interactive', className)} {...props}>
      {background ? <div className="magic-bento-card__background" aria-hidden="true">{background}</div> : null}
      <div className="magic-bento-card__content">
        <div className="magic-bento-card__heading">
          {Icon ? <span className="magic-bento-card__icon"><Icon size={20} strokeWidth={1.8} aria-hidden="true" /></span> : null}
          <div>
            {eyebrow ? <p className="magic-bento-card__eyebrow">{eyebrow}</p> : null}
            <h3>{title}</h3>
          </div>
        </div>
        {description ? <p className="magic-bento-card__description">{description}</p> : null}
        {children ? <div className="magic-bento-card__body">{children}</div> : null}
        {action ? <div className="magic-bento-card__action">{action}<ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" /></div> : null}
      </div>
    </article>
  )
}
