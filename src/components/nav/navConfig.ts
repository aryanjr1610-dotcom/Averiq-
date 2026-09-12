import {
  Home, BookOpen, Target, RotateCcw, Sparkles, Orbit, MoreHorizontal,
  Activity, Sigma, CalendarDays, Timer, NotebookPen, TrendingUp,
  Download, Trophy, Settings, Shield,
} from 'lucide-react';

export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: typeof Home;
};

/** Desktop rail — exactly these. Nothing else earns permanent space. */
export const PRIMARY_NAV: NavItem[] = [
  { key: 'home', label: 'Home', href: '/app/dashboard', icon: Home },
  { key: 'learn', label: 'Learn', href: '/app/learn', icon: BookOpen },
  { key: 'practice', label: 'Practice', href: '/app/practice', icon: Target },
  { key: 'revision', label: 'Revision', href: '/app/revision', icon: RotateCcw },
  { key: 'ai', label: 'AI Tutor', href: '/app/search', icon: Sparkles },
  { key: 'visuals', label: 'Visuals', href: '/app/visual-lab/electric-field-2d', icon: Orbit },
];

/** Mobile bottom bar — exactly 5. */
export const MOBILE_NAV: NavItem[] = [
  { key: 'home', label: 'Home', href: '/app/dashboard', icon: Home },
  { key: 'learn', label: 'Learn', href: '/app/learn', icon: BookOpen },
  { key: 'practice', label: 'Practice', href: '/app/practice', icon: Target },
  { key: 'ai', label: 'AI', href: '/app/search', icon: Sparkles },
  { key: 'more', label: 'More', href: '#more', icon: MoreHorizontal },
];

/** Everything else lives here (More menu / sheet), grouped. */
export const SECONDARY_NAV: Array<{ group: string; items: NavItem[] }> = [
  {
    group: 'Study',
    items: [
      { key: 'anatomy', label: 'Anatomy', href: '/app/anatomy', icon: Activity },
      { key: 'formulas', label: 'Formula Library', href: '/app/formulas', icon: Sigma },
      { key: 'notes', label: 'Notes', href: '/app/notes', icon: NotebookPen },
    ],
  },
  {
    group: 'Plan',
    items: [
      { key: 'planner', label: 'Planner', href: '/app/planner', icon: CalendarDays },
      { key: 'focus', label: 'Focus', href: '/app/focus', icon: Timer },
      { key: 'progress', label: 'Progress', href: '/app/progress', icon: TrendingUp },
    ],
  },
  {
    group: 'More',
    items: [
      { key: 'competitive', label: 'Competitive', href: '/app/exams', icon: Trophy },
      { key: 'downloads', label: 'Downloads', href: '/app/settings', icon: Download },
      { key: 'settings', label: 'Settings', href: '/app/settings', icon: Settings },
      { key: 'admin', label: 'Admin', href: '/admin', icon: Shield },
    ],
  },
];

/** Routes where chrome recedes. */
export const IMMERSIVE_ROUTES = ['/app/focus', '/app/visual-lab', '/app/anatomy', '/app/practice/test'];
export function isImmersive(pathname: string) {
  return IMMERSIVE_ROUTES.some((r) => pathname.startsWith(r));
}
