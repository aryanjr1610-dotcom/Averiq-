import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { spring } from "@/lib/motion";
import { NAV_PRIMARY, NAV_MORE, NAV_SEARCH } from "./navigation";
import { Button } from "@/components/ui/Button";

export function DesktopRail({
  collapsed = false, onOpenSearch,
}: { collapsed?: boolean; onOpenSearch: () => void }) {
  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 hidden h-dvh shrink-0 flex-col gap-1 border-r border-line-subtle bg-surface/40 px-3 py-5 lg:flex"
      style={{ width: collapsed ? 68 : 236, transition: "width var(--dur-standard) var(--ease-out)" }}
    >
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <AveriqMark />
        {!collapsed && <span className="t-card-title tracking-[-0.01em]">Averiq</span>}
      </div>

      <Button
        variant="ghost" size="md" onClick={onOpenSearch} fullWidth
        icon={<NAV_SEARCH.icon />}
        className="mb-4 !justify-start border-line-subtle bg-surface-interactive/40 text-content-secondary"
      >
        {!collapsed && (
          <span className="flex w-full items-center justify-between">
            Search
            <kbd className="t-caption rounded-xs border border-line px-1.5 py-0.5 text-content-tertiary">⌘K</kbd>
          </span>
        )}
      </Button>

      <ul className="flex flex-col gap-0.5">
        {NAV_PRIMARY.map((item) => (
          <li key={item.key}>
            <NavLink
              to={item.to}
              end={item.to === "/"}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                [
                  "group relative flex h-10 items-center gap-3 rounded-md px-2.5",
                  "t-body-sm font-medium transition-colors duration-fast ease-standard",
                  isActive
                    ? "text-content"
                    : "text-content-secondary hover:bg-surface-interactive/70 hover:text-content",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active state: subtle but unmistakable — 2px rail + tinted surface */}
                  {isActive && (
                    <motion.span
                      layoutId="rail-active"
                      transition={spring.responsive}
                      className="absolute inset-0 -z-10 rounded-md bg-surface-interactive"
                    />
                  )}
                  {isActive && (
                    <motion.span
                      layoutId="rail-marker"
                      transition={spring.responsive}
                      className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-subject"
                    />
                  )}
                  <item.icon
                    className="h-[18px] w-[18px] shrink-0 stroke-[1.75] transition-transform duration-fast group-hover:translate-x-px motion-reduce:transform-none"
                    aria-hidden
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-line-subtle pt-3">
        {NAV_MORE[2]!.items.map((item) => (
          <NavLink
            key={item.key} to={item.to}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              [
                "flex h-9 items-center gap-3 rounded-md px-2.5 t-body-sm transition-colors duration-fast",
                isActive ? "bg-surface-interactive text-content" : "text-content-tertiary hover:text-content",
              ].join(" ")
            }
          >
            <item.icon className="h-[17px] w-[17px] shrink-0 stroke-[1.75]" aria-hidden />
            {!collapsed && item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function AveriqMark() {
  return (
    <svg viewBox="0 0 28 28" className="h-7 w-7 shrink-0" aria-hidden>
      <rect x="0.75" y="0.75" width="26.5" height="26.5" rx="7.5"
            fill="rgb(var(--surface-interactive))" stroke="rgb(var(--border-strong) / 0.2)" />
      <path d="M8 19.5 14 8l6 11.5" fill="none" stroke="rgb(var(--accent))" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.6 15.6h6.8" stroke="rgb(var(--text-primary))" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
