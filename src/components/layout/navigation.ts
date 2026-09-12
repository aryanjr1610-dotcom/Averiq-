import {
  Home, BookOpen, Target, RotateCcw, Sparkles, Atom,
  MoreHorizontal, User, Settings, Search, NotebookPen, CalendarRange,
  Focus, HeartPulse, Sigma, TrendingUp, Download, Trophy,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  key: string; label: string; to: string; icon: LucideIcon; shortcut?: string;
}

/** Desktop rail: 6 destinations. Everything else lives under More. */
export const NAV_PRIMARY: NavItem[] = [
  { key: "home",     label: "Home",     to: "/",          icon: Home,     shortcut: "g h" },
  { key: "learn",    label: "Learn",    to: "/learn",     icon: BookOpen, shortcut: "g l" },
  { key: "practice", label: "Practice", to: "/practice",  icon: Target,   shortcut: "g p" },
  { key: "revision", label: "Revision", to: "/revision",  icon: RotateCcw,shortcut: "g r" },
  { key: "ai",       label: "AI Tutor", to: "/ai",        icon: Sparkles, shortcut: "g a" },
  { key: "visuals",  label: "Visuals",  to: "/visual-lab",icon: Atom,     shortcut: "g v" },
];

/** Mobile tab bar: 5 max, thumb-reachable. */
export const NAV_MOBILE: NavItem[] = [
  NAV_PRIMARY[0]!, NAV_PRIMARY[1]!, NAV_PRIMARY[2]!, NAV_PRIMARY[4]!,
  { key: "more", label: "More", to: "#more", icon: MoreHorizontal },
];

export const NAV_MORE: { group: string; items: NavItem[] }[] = [
  { group: "Study tools", items: [
    { key: "planner",  label: "Planner",         to: "/planner",  icon: CalendarRange },
    { key: "focus",    label: "Focus",           to: "/focus",    icon: Focus },
    { key: "notes",    label: "Notes",           to: "/notes",    icon: NotebookPen },
    { key: "formula",  label: "Formula library", to: "/formulas", icon: Sigma },
  ]},
  { group: "Explore", items: [
    { key: "anatomy",     label: "Anatomy",        to: "/anatomy",     icon: HeartPulse },
    { key: "competitive", label: "JEE / NEET / NDA", to: "/competitive", icon: Trophy },
    { key: "progress",    label: "Progress",       to: "/progress",    icon: TrendingUp },
  ]},
  { group: "Account", items: [
    { key: "downloads", label: "Downloads", to: "/downloads", icon: Download },
    { key: "profile",   label: "Profile",   to: "/profile",   icon: User },
    { key: "settings",  label: "Settings",  to: "/settings",  icon: Settings },
  ]},
];

export const NAV_SEARCH: NavItem = { key: "search", label: "Search", to: "/search", icon: Search, shortcut: "⌘K" };
