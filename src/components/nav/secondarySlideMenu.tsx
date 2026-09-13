import type { MotionSlideMenuItem } from '@/components/design/MotionSlideMenu'
import { SECONDARY_NAV } from './navConfig'

export const SECONDARY_SLIDE_ITEMS: MotionSlideMenuItem[] = SECONDARY_NAV.map((group) => ({
  id: group.group.toLowerCase().replace(/\s+/g, '-'),
  label: group.group,
  children: group.items.map((item) => {
    const Icon = item.icon
    return {
      id: item.key,
      label: item.label,
      href: item.href,
      icon: <Icon size={17} strokeWidth={1.75} aria-hidden="true" />,
    }
  }),
}))
