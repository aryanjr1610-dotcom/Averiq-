import * as React from 'react';

type RenderQuality = 'low' | 'balanced';

type MoonSurfaceProps = {
  illumination: number;
  waxing: boolean;
  quality?: RenderQuality;
};

function seeded(seed: number) {
  return () => {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Procedural lunar surface used as a lightweight visual texture.
 * It intentionally avoids pretending to be an astronomical surface map: the
 * phase is data-driven, while maria/craters are deterministic visual detail.
 */
export function MoonSurface({ illumination, waxing, quality = 'balanced' }: MoonSurfaceProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = quality === 'low' ? 144 : 224;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const rng = seeded(0x4d4f4f4e);
    const center = size / 2;
    const radius = size * 0.475;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.clip();

    const base = ctx.createRadialGradient(
      center - radius * 0.36,
      center - radius * 0.38,
      radius * 0.08,
      center,
      center,
      radius,
    );
    base.addColorStop(0, 'rgb(255, 254, 243)');
    base.addColorStop(0.42, 'rgb(230, 231, 221)');
    base.addColorStop(0.78, 'rgb(191, 195, 190)');
    base.addColorStop(1, 'rgb(126, 135, 137)');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    // Deterministic broad maria: soft, low-contrast basins rather than crisp dots.
    const maria = [
      [0.36, 0.36, 0.18, 0.12, -0.36],
      [0.58, 0.32, 0.15, 0.1, 0.24],
      [0.62, 0.57, 0.19, 0.13, -0.18],
      [0.42, 0.66, 0.14, 0.09, 0.48],
      [0.28, 0.55, 0.1, 0.08, 0.08],
    ] as const;

    for (const [x, y, rx, ry, rotation] of maria) {
      ctx.save();
      ctx.translate(size * x, size * y);
      ctx.rotate(rotation);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, size * rx);
      g.addColorStop(0, 'rgba(72, 82, 86, 0.22)');
      g.addColorStop(0.58, 'rgba(91, 100, 102, 0.14)');
      g.addColorStop(1, 'rgba(91, 100, 102, 0)');
      ctx.scale(1, ry / rx);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, size * rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const craterCount = quality === 'low' ? 32 : 58;
    for (let i = 0; i < craterCount; i += 1) {
      const angle = rng() * Math.PI * 2;
      const distance = Math.sqrt(rng()) * radius * 0.88;
      const x = center + Math.cos(angle) * distance;
      const y = center + Math.sin(angle) * distance;
      const r = size * (0.008 + Math.pow(rng(), 2.2) * 0.055);

      const shadow = ctx.createRadialGradient(x - r * 0.22, y - r * 0.26, r * 0.08, x, y, r);
      shadow.addColorStop(0, 'rgba(255, 255, 245, 0.16)');
      shadow.addColorStop(0.34, 'rgba(166, 171, 168, 0.08)');
      shadow.addColorStop(0.68, 'rgba(72, 82, 84, 0.18)');
      shadow.addColorStop(1, 'rgba(65, 74, 77, 0)');
      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fine albedo variation to stop the surface reading as a flat vector circle.
    const specks = quality === 'low' ? 170 : 320;
    for (let i = 0; i < specks; i += 1) {
      const angle = rng() * Math.PI * 2;
      const distance = Math.sqrt(rng()) * radius * 0.94;
      const x = center + Math.cos(angle) * distance;
      const y = center + Math.sin(angle) * distance;
      const alpha = 0.025 + rng() * 0.055;
      ctx.fillStyle = rng() > 0.5
        ? `rgba(255, 255, 246, ${alpha})`
        : `rgba(78, 88, 91, ${alpha})`;
      ctx.fillRect(x, y, 0.55 + rng() * 0.85, 0.55 + rng() * 0.85);
    }

    // Soft limb darkening gives the disc a spherical volume.
    const limb = ctx.createRadialGradient(center, center, radius * 0.55, center, center, radius);
    limb.addColorStop(0, 'rgba(15, 21, 24, 0)');
    limb.addColorStop(0.78, 'rgba(15, 21, 24, 0.03)');
    limb.addColorStop(1, 'rgba(10, 16, 20, 0.24)');
    ctx.fillStyle = limb;
    ctx.fillRect(0, 0, size, size);

    // Phase shadow. The outer CSS halo stays independent so it remains soft.
    const lit = Math.max(0, Math.min(1, illumination));
    if (lit < 0.995) {
      const shadowAlpha = 0.9 - lit * 0.16;
      const offset = (waxing ? -1 : 1) * radius * (0.96 - lit * 0.92);
      const terminatorScale = Math.max(0.08, Math.abs(1 - lit * 2));

      ctx.fillStyle = `rgba(5, 10, 17, ${shadowAlpha})`;
      ctx.beginPath();
      ctx.arc(center, center, radius + 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Restore the illuminated portion with a clipped, softly feathered copy.
      ctx.globalCompositeOperation = 'destination-out';
      const lightMask = ctx.createRadialGradient(
        center + offset,
        center,
        radius * 0.04,
        center + offset,
        center,
        radius * (0.96 + terminatorScale * 0.18),
      );
      lightMask.addColorStop(0, 'rgba(0,0,0,1)');
      lightMask.addColorStop(0.8, 'rgba(0,0,0,0.94)');
      lightMask.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = lightMask;
      ctx.beginPath();
      ctx.arc(center + offset, center, radius * 1.02, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();
  }, [illumination, quality, waxing]);

  return <canvas ref={canvasRef} className="living-sky__moon-texture" aria-hidden="true" />;
}
