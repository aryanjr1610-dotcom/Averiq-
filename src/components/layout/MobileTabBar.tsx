import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { spring } from "@/lib/motion";
import { NAV_MOBILE } from "./navigation";

export function MobileTabBar({ onOpenMore }: { onOpenMore: () => void }) {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Primary"
      className="safe-b fixed inset-x-0 bottom-0 z-nav border-t border-line glass lg:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-1.5">
        {NAV_MOBILE.map((item) => {
          const isMore = item.key === "more";
          const active = isMore ? false : item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);

          const inner = (
            <span className="relative flex h-full w-full flex-col items-center justify-center gap-1">
              {active && (
                <motion.span
                  layoutId="tab-active"
                  transition={spring.responsive}
                  className="absolute inset-x-2 inset-y-1.5 -z-10 rounded-md bg-surface-interactive"
                />
              )}
              <item.icon
                className={`h-[21px] w-[21px] transition-[stroke-width,color] duration-fast ${
                  active ? "text-content" : "text-content-tertiary"
                }`}
                strokeWidth={active ? 2.1 : 1.7}
                aria-hidden
              />
              <span className={`t-caption font-medium ${active ? "text-content" : "text-content-tertiary"}`}>
                {item.label}
              </span>
            </span>
          );

          return (
            <li key={item.key} className="flex-1">
              {isMore ? (
                <button
                  type="button"
                  onClick={onOpenMore}
                  aria-haspopup="dialog"
                  /* 56px min tap target, always */
                  className="h-14 w-full active:scale-[0.97] motion-reduce:active:scale-100 transition-transform duration-instant"
                >
                  {inner}
                </button>
              ) : (
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  aria-current={active ? "page" : undefined}
                  className="block h-14 w-full active:scale-[0.97] motion-reduce:active:scale-100 transition-transform duration-instant"
                >
                  {inner}
                </NavLink>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
