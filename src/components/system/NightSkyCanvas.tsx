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
  active: boolean;
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
  if (tint === 'cool') return `rgba(196, 220, 255, ${alpha})`;
  if (tint === 'warm') return `rgba(255, 235, 202, ${alpha})`;
  return `rgba(244, 248, 255, ${alpha})`;
}

function buildMilkyWay(width: number, height: number) {
  const layer = document.createElement('canvas');
  layer.width = Math.max(640, Math.round(width * 0.78));
  layer.height = Math.max(420, Math.round(height * 0.78));

  const ctx = layer.getContext('2d');
  if (!ctx) return layer;

  const w = layer.width;
  const h = layer.height;
  const rng = mulberry32(0x3f6a21d9);

  const pointOnBand = (t: number) => {
    const x = w * (-0.08 + t * 1.22);
    const y = h * (0.94 - t * 0.74 + Math.sin((t - 0.12) * Math.PI) * 0.085);
    const dx = w * 1.22;
    const dy = h * (-0.74 + Math.cos((t - 0.12) * Math.PI) * 0.085 * Math.PI);
    const length = Math.max(1, Math.hypot(dx, dy));
    return { x, y, nx: -dy / length, ny: dx / length };
  };

  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'screen';

  for (let i = 0; i < 980; i += 1) {
    const t = rng();
    const center = pointOnBand(t);
    const spread = (rng() - rng()) * h * (0.05 + 0.065 * Math.sin(Math.PI * t));
    const x = center.x + center.nx * spread + (rng() - 0.5) * w * 0.012;
    const y = center.y + center.ny * spread + (rng() - 0.5) * h * 0.012;
    const radius = 6 + rng() * 34 + (1 - Math.abs(0.32 - t)) * 9;
    const coreBoost = Math.max(0, 1 - Math.abs(t - 0.28) / 0.26);
    const alpha = 0.004 + rng() * (0.018 + coreBoost * 0.028);

    const tone = rng();
    const rgb = tone > 0.78
      ? [210, 192, 255]
      : tone > 0.5
        ? [170, 211, 255]
        : [236, 241, 255];

    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`);
    glow.addColorStop(0.45, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha * 0.38})`);
    glow.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineCap = 'round';
  for (let lane = 0; lane < 4; lane += 1) {
    ctx.beginPath();
    for (let step = 0; step <= 36; step += 1) {
      const t = step / 36;
      const p = pointOnBand(t);
      const offset = (lane - 1.5) * (8 + lane * 4) + Math.sin(t * 16 + lane) * 6;
      const x = p.x + p.nx * offset;
      const y = p.y + p.ny * offset;
      if (step === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(0, 0, 0, ${0.055 + lane * 0.02})`;
    ctx.lineWidth = 8 + lane * 7;
    ctx.stroke();
  }

  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 92; i += 1) {
    const t = 0.08 + rng() * 0.72;
    const p = pointOnBand(t);
    const spread = (rng() - rng()) * h * 0.035;
    const x = p.x + p.nx * spread;
    const y = p.y + p.ny * spread;
    const radius = 0.7 + rng() * 2.4;
    const alpha = 0.2 + rng() * 0.55;
    ctx.fillStyle = starColor(rng() > 0.72 ? 'cool' : 'neutral', alpha);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';
  return layer;
}

export function NightSkyCanvas({ active, quiet, cloudCover }: NightSkyCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const maybeContext = canvas.getContext('2d', { alpha: true });
    if (!maybeContext) return;
    const ctx: CanvasRenderingContext2D = maybeContext;

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

    const buildStars = () => {
      const rng = mulberry32(0x89f3a772);
      const count = Math.min(1450, Math.max(620, Math.round((width * height) / 1500)));
      stars = Array.from({ length: count }, () => {
        const bright = rng() > 0.955;
        const tintRoll = rng();
        return {
          x: rng(),
          y: rng(),
          radius: bright ? 1.25 + rng() * 1.6 : 0.3 + rng() * 0.72,
          alpha: bright ? 0.62 + rng() * 0.36 : 0.2 + rng() * 0.58,
          depth: 0.25 + rng() * 0.9,
          speed: 0.00035 + rng() * 0.00105,
          phase: rng() * Math.PI * 2,
          tint: tintRoll > 0.86 ? 'warm' : tintRoll > 0.58 ? 'cool' : 'neutral',
        };
      });
    };

    const resize = () => {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 1.65);
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

    const onPointerLeave = () => {
      targetPointerX = 0;
      targetPointerY = 0;
    };

    const onVisibility = () => {
      hidden = document.hidden;
      if (!hidden && !quiet && frame === 0) frame = requestAnimationFrame(draw);
    };

    const drawStars = (time: number) => {
      const drift = quiet ? 0 : (time * 0.0000035) % 1;
      for (const star of stars) {
        const twinkle = quiet ? 1 : 0.78 + Math.sin(time * star.speed + star.phase) * 0.22;
        const parallaxX = pointerX * star.depth * 5.5;
        const parallaxY = pointerY * star.depth * 3.5;
        let x = (star.x + drift * star.depth * 0.018) * width + parallaxX;
        if (x > width + 4) x -= width + 8;
        const y = star.y * height + parallaxY;
        const alpha = star.alpha * twinkle * Math.max(0.18, 1 - cloudCover * 0.72);

        if (star.radius > 1.25) {
          ctx.fillStyle = starColor(star.tint, alpha * 0.14);
          ctx.beginPath();
          ctx.arc(x, y, star.radius * 4.4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = starColor(star.tint, alpha);
        ctx.beginPath();
        ctx.arc(x, y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawMilkyWay = (time: number) => {
      if (!milkyWay) return;
      const visibility = Math.max(0.14, 1 - cloudCover * 0.78);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = visibility * 0.98;
      ctx.translate(width / 2 + pointerX * 8, height / 2 + pointerY * 5);
      if (!quiet) ctx.rotate(Math.sin(time * 0.000025) * 0.003);
      ctx.drawImage(milkyWay, -width / 2 - 30, -height / 2 - 30, width + 60, height + 60);
      ctx.restore();
    };

    const drawHorizonGlow = () => {
      const glow = ctx.createRadialGradient(width * 0.18, height * 0.94, 0, width * 0.18, height * 0.94, width * 0.58);
      glow.addColorStop(0, 'rgba(169, 207, 255, 0.15)');
      glow.addColorStop(0.28, 'rgba(91, 142, 205, 0.08)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, height * 0.55, width, height * 0.45);
    };

    function draw(time: number) {
      if (disposed || hidden) {
        frame = 0;
        return;
      }

      pointerX += (targetPointerX - pointerX) * 0.035;
      pointerY += (targetPointerY - pointerY) * 0.035;

      ctx.clearRect(0, 0, width, height);
      drawMilkyWay(time);
      drawStars(time);
      drawHorizonGlow();

      if (!quiet) frame = requestAnimationFrame(draw);
      else frame = 0;
    }

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
  }, [active, quiet, cloudCover]);

  return <canvas ref={canvasRef} className="living-sky__cosmos" aria-hidden="true" />;
}
