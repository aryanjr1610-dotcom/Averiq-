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
 * Lightweight procedural lunar texture. The illumination value is phase-driven;
 * the crater/maria placement is deterministic visual detail rather than an
 * astronomical surface map.
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

      const crater = ctx.createRadialGradient(x - r * 0.22, y - r * 0.26, r * 0.08, x, y, r);
      crater.addColorStop(0, 'rgba(255, 255, 245, 0.16)');
      crater.addColorStop(0.34, 'rgba(166, 171, 168, 0.08)');
      crater.addColorStop(0.68, 'rgba(72, 82, 84, 0.18)');
      crater.addColorStop(1, 'rgba(65, 74, 77, 0)');
      ctx.fillStyle = crater;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

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

    const limb = ctx.createRadialGradient(center, center, radius * 0.55, center, center, radius);
    limb.addColorStop(0, 'rgba(15, 21, 24, 0)');
    limb.addColorStop(0.78, 'rgba(15, 21, 24, 0.03)');
    limb.addColorStop(1, 'rgba(10, 16, 20, 0.24)');
    ctx.fillStyle = limb;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();

    const lit = Math.max(0, Math.min(1, illumination));
    if (lit < 0.995) {
      const shadowLayer = document.createElement('canvas');
      shadowLayer.width = size;
      shadowLayer.height = size;
      const shadowCtx = shadowLayer.getContext('2d', { alpha: true });
      if (!shadowCtx) return;

      shadowCtx.beginPath();
      shadowCtx.arc(center, center, radius, 0, Math.PI * 2);
      shadowCtx.clip();
      shadowCtx.fillStyle = `rgba(3, 8, 15, ${0.9 - lit * 0.14})`;
      shadowCtx.fillRect(0, 0, size, size);

      const offset = (waxing ? 1 : -1) * radius * (lit * 1.9 - 0.95);
      const lightRadius = radius * (0.72 + Math.abs(lit - 0.5) * 0.62);
      shadowCtx.globalCompositeOperation = 'destination-out';
      const lightMask = shadowCtx.createRadialGradient(
        center + offset,
        center - radius * 0.03,
        lightRadius * 0.08,
        center + offset,
        center,
        lightRadius,
      );
      lightMask.addColorStop(0, 'rgba(0,0,0,1)');
      lightMask.addColorStop(0.78, 'rgba(0,0,0,0.96)');
      lightMask.addColorStop(1, 'rgba(0,0,0,0)');
      shadowCtx.fillStyle = lightMask;
      shadowCtx.beginPath();
      shadowCtx.arc(center + offset, center, lightRadius, 0, Math.PI * 2);
      shadowCtx.fill();
      shadowCtx.globalCompositeOperation = 'source-over';

      ctx.drawImage(shadowLayer, 0, 0);
    }
  }, [illumination, quality, waxing]);

  return <canvas ref={canvasRef} className="living-sky__moon-texture" aria-hidden="true" />;
}
