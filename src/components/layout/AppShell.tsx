import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { routeVariants, reducedRoute } from "@/lib/motion";
import { usePrefersReducedMotion, useDeviceClass } from "@/hooks/useMotionPreference";
import { AcademicAtmosphere, type Stream, type Subject } from "@/components/atmosphere/AcademicAtmosphere";
import { DesktopRail } from "./DesktopRail";
import { MobileTabBar } from "./MobileTabBar";
import { Sheet } from "./Sheet";
import { NAV_MORE, NAV_PRIMARY } from "./navigation";
import { CommandPalette } from "@/components/search/CommandPalette";

/** Routes that own the whole viewport: chrome recedes. */
const IMMERSIVE = ["/visual-lab", "/anatomy", "/focus"];
const DENSITY: Record<string, "editorial" | "default" | "compact"> = {
  "/learn": "editorial", "/revision": "compact", "/competitive": "compact",
  "/practice": "default", "/admin": "compact",
};

export function AppShell({
  stream = "foundation", subject = "none", visualMode = "full",
}: { stream?: Stream; subject?: Subject; visualMode?: "full" | "reduced" }) {
  const { pathname } = useLocation();
  const device = useDeviceClass();
  const reduced = usePrefersReducedMotion();
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const immersive = IMMERSIVE.some((p) => pathname.startsWith(p));
  const isFocus = pathname.startsWith("/focus");
  const isReader = pathname.startsWith("/learn/") || pathname.startsWith("/revision/");
  const density = Object.entries(DENSITY).find(([p]) => pathname.startsWith(p))?.[1] ?? "default";

  return (
    <div
      data-stream={stream}
      data-subject={subject}
      data-density={density}
      data-visual-mode={visualMode}
      className="relative min-h-dvh"
    >
      <AcademicAtmosphere
        stream={stream} subject={subject} visualMode={visualMode}
        variant={isFocus ? "focus" : immersive ? "immersive" : isReader ? "reading" : "app"}
      />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-modal focus:rounded-md focus:bg-surface-overlay focus:px-4 focus:py-2 focus:shadow-e3"
      >
        Skip to content
      </a>

      <div className="relative z-[10] mx-auto flex w-full max-w-app">
        {/* DESKTOP: full rail. IMMERSIVE: collapsed to icons. */}
        {device === "desktop" && !isFocus && (
          <DesktopRail collapsed={immersive} onOpenSearch={() => setSearchOpen(true)} />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {/* TABLET: its own layout — horizontal segmented nav, not a squeezed sidebar. */}
          {device === "tablet" && !isFocus && (
            <nav
              aria-label="Primary"
              className="safe-t sticky top-0 z-nav border-b border-line-subtle glass px-4 py-2.5"
            >
              <ul className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {NAV_PRIMARY.map((i) => (
                  <li key={i.key}>
                    <NavLink
                      to={i.to} end={i.to === "/"}
                      className={({ isActive }) =>
                        [
                          "flex h-10 items-center gap-2 rounded-md px-3.5 t-body-sm font-medium",
                          "transition-colors duration-fast whitespace-nowrap",
                          isActive
                            ? "bg-surface-interactive text-content"
                            : "text-content-secondary hover:bg-surface-interactive/60",
                        ].join(" ")
                      }
                    >
                      <i.icon className="h-[18px] w-[18px] stroke-[1.75]" aria-hidden />
                      {i.label}
                    </NavLink>
                  </li>
                ))}
                <li className="ml-auto">
                  <button
                    onClick={() => setMoreOpen(true)}
                    className="flex h-10 items-center gap-2 rounded-md px-3.5 t-body-sm text-content-secondary transition-colors duration-fast hover:bg-surface-interactive/60"
                  >
                    More
                  </button>
                </li>
              </ul>
            </nav>
          )}

          <main
            id="main"
            className={[
              "min-w-0 flex-1",
              immersive ? "px-0 pt-0" : "px-page-x pt-6 sm:pt-8",
              device === "phone" && !isFocus ? "pb-[calc(56px+env(safe-area-inset-bottom)+24px)]" : "pb-section",
            ].join(" ")}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                variants={reduced ? reducedRoute : routeVariants}
                initial="initial" animate="animate" exit="exit"
                className={immersive ? "" : "mx-auto w-full max-w-content"}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {device === "phone" && !isFocus && <MobileTabBar onOpenMore={() => setMoreOpen(true)} />}

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="flex flex-col gap-6">
          {NAV_MORE.map((group) => (
            <section key={group.group}>
              <h3 className="t-overline mb-2 px-1 text-content-tertiary">{group.group}</h3>
              <ul className="overflow-hidden rounded-lg border border-line-subtle bg-surface">
                {group.items.map((item, i) => (
                  <li key={item.key}>
                    <NavLink
                      to={item.to}
                      onClick={() => setMoreOpen(false)}
                      className={`flex min-h-[52px] items-center gap-3.5 px-4 t-body transition-colors duration-fast active:bg-surface-interactive ${
                        i > 0 ? "border-t border-line-subtle" : ""
                      }`}
                    >
                      <item.icon className="h-[19px] w-[19px] shrink-0 stroke-[1.75] text-content-secondary" aria-hidden />
                      <span className="flex-1">{item.label}</span>
                      <svg viewBox="0 0 16 16" className="h-4 w-4 text-content-tertiary" aria-hidden>
                        <path d="m6 4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Sheet>

      {searchOpen && <CommandPalette onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
