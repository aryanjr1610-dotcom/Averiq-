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
  glow: number;
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
  if (tint === 'cool') return `rgba(198, 218, 248, ${alpha})`;
  if (tint === 'warm') return `rgba(255, 230, 191, ${alpha})`;
  return `rgba(244, 247, 250, ${alpha})`;
}

function buildMilkyWay(width: number, height: number, quality: RenderQuality) {
  const layer = document.createElement('canvas');
  const scale = quality === 'low' ? 0.56 : 0.72;
  layer.width = Math.max(480, Math.round(width * scale));
  layer.height = Math.max(300, Math.round(height * scale));
  const ctx = layer.getContext('2d');
  if (!ctx) return layer;

  const w = layer.width;
  const h = layer.height;
  const rng = mulberry32(0x3f6a21d9);
  const band = (t: number) => {
    const x = w * (-0.08 + t * 1.2);
    const y = h * (0.9 - t * 0.72 + Math.sin((t - 0.12) * Math.PI) * 0.075);
    const dx = w * 1.2;
    const dy = h * (-0.72 + Math.cos((t - 0.12) * Math.PI) * 0.075 * Math.PI);
    const length = Math.max(1, Math.hypot(dx, dy));
    return { x, y, nx: -dy / length, ny: dx / length };
  };

  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'screen';

  const glowCount = quality === 'low' ? 190 : 360;
  for (let i = 0; i < glowCount; i += 1) {
    const t = rng();
    const p = band(t);
    const spread = (rng() - rng()) * h * (0.04 + Math.sin(Math.PI * t) * 0.055);
    const x = p.x + p.nx * spread;
    const y = p.y + p.ny * spread;
    const radius = 5 + Math.pow(rng(), 0.7) * 22;
    const core = Math.max(0, 1 - Math.abs(t - 0.31) / 0.3);
    const alpha = 0.003 + rng() * (0.009 + core * 0.017);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, `rgba(216, 226, 244, ${alpha})`);
    glow.addColorStop(0.42, `rgba(180, 201, 232, ${alpha * 0.38})`);
    glow.addColorStop(1, 'rgba(165, 190, 224, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  const dustCount = quality === 'low' ? 230 : 440;
  for (let i = 0; i < dustCount; i += 1) {
    const t = rng();
    const p = band(t);
    const spread = (rng() - rng()) * h * 0.052;
    const x = p.x + p.nx * spread;
    const y = p.y + p.ny * spread;
    const radius = 0.16 + Math.pow(rng(), 2.4) * 0.75;
    const alpha = 0.09 + rng() * 0.31;
    ctx.fillStyle = starColor(rng() > 0.82 ? 'cool' : 'neutral', alpha);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // A darker central dust lane keeps the band from reading as a glowing stripe.
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(9, h * 0.023);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.23)';
  ctx.beginPath();
  for (let i = 0; i <= 28; i += 1) {
    const t = i / 28;
    const p = band(t);
    const x = p.x + p.nx * Math.sin(t * 8.2) * h * 0.007;
    const y = p.y + p.ny * Math.sin(t * 8.2) * h * 0.007;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
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
    const targetFrameMs = quality === 'low' ? 1000 / 18 : 1000 / 28;
    const eventRandom = mulberry32(0x5a71c3e9);
    let shootingStartedAt: number | null = null;
    let nextShootingAt = performance.now() + 58_000 + eventRandom() * 92_000;

    const buildStars = () => {
      const rng = mulberry32(0x89f3a772);
      const areaCount = Math.round((width * height) / (quality === 'low' ? 2850 : 1850));
      const count = quality === 'low'
        ? Math.min(620, Math.max(340, areaCount))
        : Math.min(1120, Math.max(620, areaCount));

      stars = Array.from({ length: count }, () => {
        // Most visible stars should be faint; bright points are intentionally rare.
        const brightnessRoll = Math.pow(rng(), 4.2);
        const veryBright = brightnessRoll > 0.84;
        const tintRoll = rng();
        const y = rng();
        return {
          x: rng(),
          y,
          radius: veryBright
            ? 0.72 + rng() * 0.58
            : 0.18 + brightnessRoll * 0.5,
          alpha: 0.12 + brightnessRoll * 0.74,
          depth: 0.2 + rng() * 0.8,
          speed: 0.00018 + rng() * 0.00058,
          phase: rng() * Math.PI * 2,
          glow: veryBright ? 0.35 + rng() * 0.65 : 0,
          tint: tintRoll > 0.91 ? 'warm' : tintRoll > 0.67 ? 'cool' : 'neutral',
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
      const clearFactor = Math.max(0.03, 1 - cloudCover * 0.94);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = clearFactor * (quality === 'low' ? 0.42 : 0.56);
      ctx.translate(width / 2 + pointerX * 1.2, height / 2 + pointerY * 0.9);
      if (!quiet && quality !== 'low') ctx.rotate(Math.sin(time * 0.000018) * 0.0016);
      ctx.drawImage(milkyWay, -width / 2 - 18, -height / 2 - 18, width + 36, height + 36);
      ctx.restore();
    };

    const drawStars = (time: number) => {
      const drift = quiet ? 0 : (time * 0.0000017) % 1;
      const clearFactor = Math.max(0.05, 1 - cloudCover * 0.9);

      for (const star of stars) {
        // Near-horizon extinction keeps the lower sky less artificially crowded.
        const horizonExtinction = 1 - Math.pow(star.y, 2.4) * 0.48;
        const twinkleAmount = star.radius > 0.72 ? 0.11 : 0.045;
        const twinkle = quiet ? 1 : 1 - twinkleAmount + Math.sin(time * star.speed + star.phase) * twinkleAmount;
        const parallaxX = quality === 'low' ? 0 : pointerX * star.depth * 0.8;
        const parallaxY = quality === 'low' ? 0 : pointerY * star.depth * 0.58;
        let x = (star.x + drift * star.depth * 0.009) * width + parallaxX;
        if (x > width + 4) x -= width + 8;
        const y = star.y * height + parallaxY;
        const alpha = star.alpha * twinkle * clearFactor * horizonExtinction;

        if (star.glow > 0 && quality !== 'low') {
          const glowRadius = 2.5 + star.glow * 3.6;
          const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
          glow.addColorStop(0, starColor(star.tint, alpha * 0.42));
          glow.addColorStop(1, starColor(star.tint, 0));
          ctx.fillStyle = glow;
          ctx.fillRect(x - glowRadius, y - glowRadius, glowRadius * 2, glowRadius * 2);
        }

        ctx.fillStyle = starColor(star.tint, alpha);
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.3, star.radius), 0, Math.PI * 2);
        ctx.fill();

        if (star.glow > 0.7 && quality !== 'low') {
          ctx.strokeStyle = starColor(star.tint, alpha * 0.24);
          ctx.lineWidth = 0.45;
          ctx.beginPath();
          ctx.moveTo(x - star.radius * 2.1, y);
          ctx.lineTo(x + star.radius * 2.1, y);
          ctx.moveTo(x, y - star.radius * 1.8);
          ctx.lineTo(x, y + star.radius * 1.8);
          ctx.stroke();
        }
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
      pointerX += (targetPointerX - pointerX) * 0.07;
      pointerY += (targetPointerY - pointerY) * 0.07;
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
