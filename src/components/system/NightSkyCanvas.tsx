import * as React from 'react';

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

function buildMilkyWay(width: number, height: number) {
  const layer = document.createElement('canvas');
  layer.width = Math.max(720, Math.round(width * 0.82));
  layer.height = Math.max(440, Math.round(height * 0.82));
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

  for (let i = 0; i < 720; i += 1) {
    const t = rng();
    const p = band(t);
    const spread = (rng() - rng()) * h * (0.035 + Math.sin(Math.PI * t) * 0.045);
    const x = p.x + p.nx * spread;
    const y = p.y + p.ny * spread;
    const radius = 5 + rng() * 22;
    const core = Math.max(0, 1 - Math.abs(t - 0.3) / 0.28);
    const alpha = 0.003 + rng() * (0.011 + core * 0.015);
    const tone = rng();
    const rgb = tone > 0.8 ? [201, 207, 241] : tone > 0.55 ? [174, 207, 240] : [229, 235, 242];
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`);
    glow.addColorStop(0.45, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha * 0.32})`);
    glow.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  for (let i = 0; i < 680; i += 1) {
    const t = rng();
    const p = band(t);
    const spread = (rng() - rng()) * h * 0.05;
    const x = p.x + p.nx * spread;
    const y = p.y + p.ny * spread;
    const radius = 0.22 + rng() * 0.72;
    const alpha = 0.12 + rng() * 0.42;
    ctx.fillStyle = starColor(rng() > 0.8 ? 'cool' : 'neutral', alpha);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineCap = 'round';
  for (let lane = 0; lane < 3; lane += 1) {
    ctx.beginPath();
    for (let step = 0; step <= 40; step += 1) {
      const t = step / 40;
      const p = band(t);
      const offset = (lane - 1) * (9 + lane * 4) + Math.sin(t * 15 + lane) * 4;
      const x = p.x + p.nx * offset;
      const y = p.y + p.ny * offset;
      if (step === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(0, 0, 0, ${0.045 + lane * 0.015})`;
    ctx.lineWidth = 7 + lane * 6;
    ctx.stroke();
  }

  ctx.globalCompositeOperation = 'source-over';
  return layer;
}

export function NightSkyCanvas({ visibility, quiet, cloudCover }: NightSkyCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    if (visibility <= 0.015) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d', { alpha: true });
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
    const eventRandom = mulberry32(0x5a71c3e9);
    let shootingStartedAt: number | null = null;
    let nextShootingAt = performance.now() + 58_000 + eventRandom() * 92_000;

    const buildStars = () => {
      const rng = mulberry32(0x89f3a772);
      const count = Math.min(2300, Math.max(900, Math.round((width * height) / 1050)));
      stars = Array.from({ length: count }, () => {
        const bright = rng() > 0.975;
        const tintRoll = rng();
        return {
          x: rng(),
          y: rng(),
          radius: bright ? 0.85 + rng() * 0.58 : 0.18 + rng() * 0.54,
          alpha: bright ? 0.62 + rng() * 0.28 : 0.16 + rng() * 0.52,
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
      dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
      milkyWay = buildMilkyWay(width, height);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (quiet || event.pointerType === 'touch') return;
      targetPointerX = ((event.clientX / Math.max(1, width)) - 0.5) * 2;
      targetPointerY = ((event.clientY / Math.max(1, height)) - 0.5) * 2;
    };
    const onPointerLeave = () => { targetPointerX = 0; targetPointerY = 0; };
    const onVisibility = () => {
      hidden = document.hidden;
      if (!hidden && !quiet && frame === 0) frame = requestAnimationFrame(draw);
    };

    const drawMilkyWay = (time: number) => {
      if (!milkyWay) return;
      const clearFactor = Math.max(0.04, 1 - cloudCover * 0.9);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = clearFactor * 0.7;
      ctx.translate(width / 2 + pointerX * 2.2, height / 2 + pointerY * 1.8);
      if (!quiet) ctx.rotate(Math.sin(time * 0.00002) * 0.0025);
      ctx.drawImage(milkyWay, -width / 2 - 24, -height / 2 - 24, width + 48, height + 48);
      ctx.restore();
    };

    const drawStars = (time: number) => {
      const drift = quiet ? 0 : (time * 0.0000026) % 1;
      for (const star of stars) {
        const twinkle = quiet ? 1 : 0.9 + Math.sin(time * star.speed + star.phase) * 0.1;
        const parallaxX = pointerX * star.depth * 1.25;
        const parallaxY = pointerY * star.depth;
        let x = (star.x + drift * star.depth * 0.014) * width + parallaxX;
        if (x > width + 3) x -= width + 6;
        const y = star.y * height + parallaxY;
        const alpha = star.alpha * twinkle * Math.max(0.08, 1 - cloudCover * 0.86);

        if (star.radius > 1.05) {
          ctx.fillStyle = starColor(star.tint, alpha * 0.1);
          ctx.beginPath();
          ctx.arc(x, y, star.radius * 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = starColor(star.tint, alpha);
        ctx.beginPath();
        ctx.arc(x, y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawShootingStar = (time: number) => {
      if (quiet || visibility < 0.76 || cloudCover > 0.32) return;
      if (shootingStartedAt === null && time >= nextShootingAt) shootingStartedAt = time;
      if (shootingStartedAt === null) return;
      const progress = (time - shootingStartedAt) / 920;
      if (progress >= 1) {
        shootingStartedAt = null;
        nextShootingAt = time + 65_000 + eventRandom() * 105_000;
        return;
      }
      const eased = 1 - Math.pow(1 - progress, 3);
      const startX = width * 0.84;
      const startY = height * 0.12;
      const x = startX - width * 0.2 * eased;
      const y = startY + height * 0.16 * eased;
      const alpha = Math.sin(progress * Math.PI) * 0.66;
      const trailX = x + width * 0.062;
      const trailY = y - height * 0.048;
      const trail = ctx.createLinearGradient(x, y, trailX, trailY);
      trail.addColorStop(0, `rgba(250, 252, 255, ${alpha})`);
      trail.addColorStop(1, 'rgba(190, 217, 242, 0)');
      ctx.strokeStyle = trail;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(trailX, trailY);
      ctx.stroke();
    };

    const draw = (time: number) => {
      if (disposed || hidden) {
        frame = 0;
        return;
      }
      pointerX += (targetPointerX - pointerX) * 0.03;
      pointerY += (targetPointerY - pointerY) * 0.03;
      ctx.clearRect(0, 0, width, height);
      drawMilkyWay(time);
      drawStars(time);
      drawShootingStar(time);
      if (!quiet) frame = requestAnimationFrame(draw);
      else frame = 0;
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    draw(performance.now());

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [cloudCover, quiet, visibility]);

  return <canvas ref={canvasRef} className="living-sky__cosmos" aria-hidden="true" />;
}
