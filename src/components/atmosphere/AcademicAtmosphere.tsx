import { memo } from "react";
import { useAmbientAllowed, type VisualMode } from "@/hooks/useMotionPreference";

export type Stream = "pcm" | "pcb" | "pcmb" | "commerce" | "humanities" | "foundation";
export type Subject =
  | "physics" | "maths" | "chemistry" | "biology" | "english" | "history" | "economics" | "none";

type Motif = "field" | "grid" | "organic" | "analytic" | "cartographic" | "editorial";

const MOTIF_BY_SUBJECT: Record<Subject, Motif | null> = {
  physics: "field", maths: "grid", chemistry: "organic", biology: "organic",
  english: "editorial", history: "cartographic", economics: "analytic", none: null,
};
const MOTIF_BY_STREAM: Record<Stream, Motif> = {
  pcm: "grid", pcb: "organic", pcmb: "field",
  commerce: "analytic", humanities: "cartographic", foundation: "grid",
};

/** Motifs are pure SVG patterns at ~4% opacity. They never touch text contrast. */
function MotifDefs({ motif }: { motif: Motif }) {
  const stroke = "rgb(var(--subject-accent))";
  switch (motif) {
    case "grid":
      return (
        <pattern id="atm" width="72" height="72" patternUnits="userSpaceOnUse">
          <path d="M72 0H0v72" fill="none" stroke={stroke} strokeWidth="1" />
          <path d="M0 36h72M36 0v72" fill="none" stroke={stroke} strokeWidth="0.5" opacity="0.5" />
        </pattern>
      );
    case "field":
      return (
        <pattern id="atm" width="96" height="96" patternUnits="userSpaceOnUse">
          <path d="M0 72q24-40 48 0t48 0" fill="none" stroke={stroke} strokeWidth="1" />
          <path d="M0 24q24-40 48 0t48 0" fill="none" stroke={stroke} strokeWidth="0.75" opacity="0.7" />
        </pattern>
      );
    case "organic":
      return (
        <pattern id="atm" width="88" height="88" patternUnits="userSpaceOnUse">
          <circle cx="22" cy="22" r="15" fill="none" stroke={stroke} strokeWidth="1" />
          <circle cx="66" cy="62" r="21" fill="none" stroke={stroke} strokeWidth="0.75" />
          <circle cx="22" cy="22" r="2.5" fill={stroke} opacity="0.5" />
        </pattern>
      );
    case "analytic":
      return (
        <pattern id="atm" width="104" height="104" patternUnits="userSpaceOnUse">
          <path d="M0 96h104M8 96V60M28 96V40M48 96V68M68 96V28M88 96V52"
                fill="none" stroke={stroke} strokeWidth="1" strokeLinecap="round" />
          <path d="M0 78C30 78 54 34 104 20" fill="none" stroke={stroke} strokeWidth="0.75" opacity="0.7" />
        </pattern>
      );
    case "cartographic":
      return (
        <pattern id="atm" width="120" height="120" patternUnits="userSpaceOnUse">
          <path d="M-10 40q40-26 72 0t68-6" fill="none" stroke={stroke} strokeWidth="1" />
          <path d="M-10 74q46-22 78 4t62-10" fill="none" stroke={stroke} strokeWidth="0.75" opacity="0.7" />
          <circle cx="52" cy="52" r="3" fill="none" stroke={stroke} strokeWidth="1" />
        </pattern>
      );
    case "editorial":
      return (
        <pattern id="atm" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M0 8L8 0" stroke={stroke} strokeWidth="0.6" />
        </pattern>
      );
  }
}

interface Props {
  stream?: Stream;
  subject?: Subject;
  variant?: "app" | "immersive" | "reading" | "focus";
  visualMode?: VisualMode;
}

export const AcademicAtmosphere = memo(function AcademicAtmosphere({
  stream = "foundation",
  subject = "none",
  variant = "app",
  visualMode = "full",
}: Props) {
  const ambient = useAmbientAllowed(visualMode);
  const motif = MOTIF_BY_SUBJECT[subject] ?? MOTIF_BY_STREAM[stream];

  // Focus mode: zero decoration. Reading: motif only, no glow.
  if (variant === "focus") {
    return <div aria-hidden className="pointer-events-none fixed inset-0 bg-canvas" style={{ zIndex: 0 }} />;
  }

  const glowOpacity = variant === "immersive" ? 0.5 : variant === "reading" ? 0.16 : 0.32;

  return (
    <div
      aria-hidden
      data-atmosphere={variant}
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0, contain: "strict" }}
    >
      {/* 1 — base canvas */}
      <div className="absolute inset-0 bg-canvas" />

      {/* 2 — ambient gradient: two soft sources, transitions on subject change */}
      <div
        className="absolute inset-0 transition-[background-image,opacity] duration-slow ease-out"
        style={{
          opacity: glowOpacity,
          backgroundImage: `
            radial-gradient(1100px 620px at 12% -8%,  rgb(var(--subject-accent) / 0.20), transparent 62%),
            radial-gradient(900px  760px at 96% 14%,  rgb(var(--accent) / 0.10),        transparent 66%)`,
        }}
      />

      {/* 3 — academic motif */}
      <svg
        className="absolute inset-0 h-full w-full transition-opacity duration-slow ease-out"
        style={{ opacity: `var(--subject-motif-opacity)` }}
      >
        <defs><MotifDefs motif={motif} /></defs>
        <rect width="100%" height="100%" fill="url(#atm)" />
      </svg>

      {/* 4 — very light grain: static, GPU-cheap, kills gradient banding */}
      <div
        className="absolute inset-0 mix-blend-soft-light"
        style={{
          opacity: 0.05,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "160px 160px",
        }}
      />

      {/* 5 — vignette: focuses content, cinematic without darkening text */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(130% 90% at 50% 0%, transparent 42%, rgb(var(--surface-immersive) / 0.55) 100%)",
        }}
      />

      {/* 6 — the ONLY moving layer: 40s drift, transform-only, opt-in */}
      {ambient && variant === "immersive" && (
        <div
          data-ambient
          className="absolute -inset-1/4 will-change-transform"
          style={{
            opacity: 0.16,
            backgroundImage:
              "radial-gradient(620px 420px at 30% 40%, rgb(var(--subject-accent) / 0.30), transparent 70%)",
            animation: "atm-drift 44s var(--ease-in-out) infinite alternate",
          }}
        />
      )}

      <style>{`
        @keyframes atm-drift {
          from { transform: translate3d(-2%, -1%, 0) scale(1); }
          to   { transform: translate3d(3%, 2%, 0) scale(1.06); }
        }
      `}</style>
    </div>
  );
});
