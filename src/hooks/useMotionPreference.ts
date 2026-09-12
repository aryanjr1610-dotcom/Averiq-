import { useEffect, useState } from "react";

export type VisualMode = "full" | "reduced";

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** True when ambient/decorative motion is allowed at all. */
export function useAmbientAllowed(visualMode: VisualMode = "full"): boolean {
  const reduced = usePrefersReducedMotion();
  const [capable, setCapable] = useState(true);

  useEffect(() => {
    const cores = navigator.hardwareConcurrency ?? 4;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
    const saveData =
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData ?? false;
    setCapable(cores > 4 && mem >= 4 && !saveData);
  }, []);

  return !reduced && visualMode === "full" && capable;
}

/** Breakpoint class: drives deliberate tablet layout (not "small desktop"). */
export function useDeviceClass(): "phone" | "tablet" | "desktop" {
  const [cls, setCls] = useState<"phone" | "tablet" | "desktop">("desktop");
  useEffect(() => {
    const tablet = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    const phone = window.matchMedia("(max-width: 767px)");
    const compute = () => setCls(phone.matches ? "phone" : tablet.matches ? "tablet" : "desktop");
    compute();
    phone.addEventListener("change", compute);
    tablet.addEventListener("change", compute);
    return () => { phone.removeEventListener("change", compute); tablet.removeEventListener("change", compute); };
  }, []);
  return cls;
}
