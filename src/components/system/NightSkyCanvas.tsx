import * as React from 'react';

type RenderQuality = 'low' | 'balanced';

type Star = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  depth: number;
  speed: number;
  phase: number;
  tint: 'cool' | 'neutral' | 'warm';
};

type NightSkyCanvasProps = {
  visibility: number;
  quiet: boolean;
  cloudCover: number;
  quality?: RenderQuality;
};

function mulberry32(seed: number) {
  return () => {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function starColor(tint: Star['tint'], alpha: number) {
  if (tint === 'cool') return `rgba(202, 221, 249, ${alpha})`;
  if (tint === 'warm') return `rgba(255, 237, 208, ${alpha})`;
  return `rgba(244, 247, 250, ${alpha})`;
}

function buildMilkyWay(width: number, height: number, quality: RenderQuality) {
  const layer = document.createElement('canvas');
  const scale = quality === 'low' ? 0.58 : 0.72;
  layer.width = Math.max(480, Math.round(width * scale));
  layer.height = Math.max(300, Math.round(height * scale));
  const ctx = layer.getContext('2d');
  if (!ctx) return layer;

  const w = layer.width;
  const h = layer.height;
  const rng = mulberry32(0x3f6a21d9);
  const band = (t: number) => {
    const x = w * (-0.08 + t * 1.2);
    const y = h * (0.88 - t * 0.7 + Math.sin((t - 0.1) * Math.PI) * 0.07);
    const dx = w * 1.2;
    const dy = h * (-0.7 + Math.cos((t - 0.1) * Math.PI) * 0.07 * Math.PI);
    const length = Math.max(1, Math.hypot(dx, dy));
    return { x, y, nx: -dy / length, ny: dx / length };
  };

  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'screen';

  const glowCount = quality === 'low' ? 170 : 320;
  for (let i = 0; i < glowCount; i += 1) {
    const t = rng();
    const p = band(t);
    const spread = (rng() - rng()) * h * (0.035 + Math.sin(Math.PI * t) * 0.045);
    const x = p.x + p.nx * spread;
    const y = p.y + p.ny * spread;
    const radius = 4 + rng() * 16;
    const core = Math.max(0, 1 - Math.abs(t - 0.3) / 0.28);
    const alpha = 0.004 + rng() * (0.01 + core * 0.012);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, `rgba(210, 222, 242, ${alpha})`);
    glow.addColorStop(0.5, `rgba(185, 208, 236, ${alpha * 0.3})`);
    glow.addColorStop(1, 'rgba(185, 208, 236, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  const dustCount = quality === 'low' ? 240 : 420;
  for (let i = 0; i < dustCount; i += 1) {
    const t = rng();
    const p = band(t);
    const spread = (rng() - rng()) * h * 0.05;
    const x = p.x + p.nx * spread;
    const y = p.y + p.ny * spread;
    const radius = 0.2 + rng() * 0.55;
    const alpha = 0.12 + rng() * 0.34;
    ctx.fillStyle = starColor(rng() > 0.8 ? 'cool' : 'neutral', alpha);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';
  return layer;
}

export function NightSkyCanvas({ visibility, quiet, cloudCover, quality = 'balanced' }: NightSkyCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    if (visibility <= 0.015) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!context) return;
    const ctx: CanvasRenderingContext2D = context;

    let frame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let stars: Star[] = [];
    let milkyWay: HTMLCanvasElement | null = null;
    let disposed = false;
    let hidden = document.hidden;
    let pointerX = 0;
    let pointerY = 0;
    let targetPointerX = 0;
    let targetPointerY = 0;
    let lastDraw = 0;
    const targetFrameMs = quality === 'low' ? 1000 / 20 : 1000 / 28;
    const eventRandom = mulberry32(0x5a71c3e9);
    let shootingStartedAt: number | null = null;
    let nextShootingAt = performance.now() + 58_000 + eventRandom() * 92_000;

    const buildStars = () => {
      const rng = mulberry32(0x89f3a772);
      const areaCount = Math.round((width * height) / (quality === 'low' ? 2600 : 1750));
      const count = quality === 'low'
        ? Math.min(700, Math.max(380, areaCount))
        : Math.min(1250, Math.max(650, areaCount));
      stars = Array.from({ length: count }, () => {
        const bright = rng() > 0.982;
        const tintRoll = rng();
        return {
          x: rng(),
          y: rng(),
          radius: bright ? 0.72 + rng() * 0.46 : 0.16 + rng() * 0.46,
          alpha: bright ? 0.58 + rng() * 0.25 : 0.14 + rng() * 0.48,
          depth: 0.22 + rng() * 0.84,
          speed: 0.00022 + rng() * 0.00072,
          phase: rng() * Math.PI * 2,
          tint: tintRoll > 0.9 ? 'warm' : tintRoll > 0.66 ? 'cool' : 'neutral',
        };
      });
    };

    const resize = () => {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      dpr = quality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 1.15);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
      milkyWay = buildMilkyWay(width, height, quality);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (quiet || quality === 'low' || event.pointerType === 'touch') return;
      targetPointerX = ((event.clientX / Math.max(1, width)) - 0.5) * 2;
      targetPointerY = ((event.clientY / Math.max(1, height)) - 0.5) * 2;
    };
    const onPointerLeave = () => { targetPointerX = 0; targetPointerY = 0; };

    const drawMilkyWay = (time: number) => {
      if (!milkyWay) return;
      const clearFactor = Math.max(0.04, 1 - cloudCover * 0.9);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = clearFactor * (quality === 'low' ? 0.48 : 0.62);
      ctx.translate(width / 2 + pointerX * 1.4, height / 2 + pointerY * 1.1);
      if (!quiet && quality !== 'low') ctx.rotate(Math.sin(time * 0.00002) * 0.002);
      ctx.drawImage(milkyWay, -width / 2 - 16, -height / 2 - 16, width + 32, height + 32);
      ctx.restore();
    };

    const drawStars = (time: number) => {
      const drift = quiet ? 0 : (time * 0.0000022) % 1;
      const clearFactor = Math.max(0.08, 1 - cloudCover * 0.86);
      for (const star of stars) {
        const twinkle = quiet ? 1 : 0.92 + Math.sin(time * star.speed + star.phase) * 0.08;
        const parallaxX = quality === 'low' ? 0 : pointerX * star.depth;
        const parallaxY = quality === 'low' ? 0 : pointerY * star.depth * 0.8;
        let x = (star.x + drift * star.depth * 0.011) * width + parallaxX;
        if (x > width + 3) x -= width + 6;
        const y = star.y * height + parallaxY;
        const alpha = star.alpha * twinkle * clearFactor;
        ctx.fillStyle = starColor(star.tint, alpha);
        ctx.fillRect(x, y, Math.max(0.45, star.radius * 1.35), Math.max(0.45, star.radius * 1.35));
      }
    };

    const drawShootingStar = (time: number) => {
      if (quiet || quality === 'low' || visibility < 0.76 || cloudCover > 0.32) return;
      if (shootingStartedAt === null && time >= nextShootingAt) shootingStartedAt = time;
      if (shootingStartedAt === null) return;
      const progress = (time - shootingStartedAt) / 920;
      if (progress >= 1) {
        shootingStartedAt = null;
        nextShootingAt = time + 65_000 + eventRandom() * 105_000;
        return;
      }
      const eased = 1 - Math.pow(1 - progress, 3);
      const x = width * 0.84 - width * 0.2 * eased;
      const y = height * 0.12 + height * 0.16 * eased;
      const alpha = Math.sin(progress * Math.PI) * 0.66;
      const trail = ctx.createLinearGradient(x, y, x + width * 0.062, y - height * 0.048);
      trail.addColorStop(0, `rgba(250, 252, 255, ${alpha})`);
      trail.addColorStop(1, 'rgba(190, 217, 242, 0)');
      ctx.strokeStyle = trail;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + width * 0.062, y - height * 0.048);
      ctx.stroke();
    };

    const draw = (time: number) => {
      if (disposed || hidden) {
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(draw);
      if (!quiet && time - lastDraw < targetFrameMs) return;
      lastDraw = time;
      pointerX += (targetPointerX - pointerX) * 0.08;
      pointerY += (targetPointerY - pointerY) * 0.08;
      ctx.clearRect(0, 0, width, height);
      drawMilkyWay(time);
      drawStars(time);
      drawShootingStar(time);
      if (quiet && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const onVisibility = () => {
      hidden = document.hidden;
      if (!hidden && frame === 0) frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    if (quality !== 'low') {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerleave', onPointerLeave, { passive: true });
    }
    document.addEventListener('visibilitychange', onVisibility);
    frame = requestAnimationFrame(draw);

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [cloudCover, quality, quiet, visibility]);

  return <canvas ref={canvasRef} className="living-sky__cosmos" aria-hidden="true" />;
}
