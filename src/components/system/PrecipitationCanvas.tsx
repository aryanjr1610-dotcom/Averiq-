import * as React from 'react';

import type { SkyWeather } from '@/features/environment/environment';

type RenderQuality = 'low' | 'balanced';

type Drop = {
  x: number;
  y: number;
  depth: number;
  length: number;
  speed: number;
};

type PrecipitationCanvasProps = {
  weather: SkyWeather;
  precipitation: number;
  windSpeed: number;
  windDirection: number;
  quiet: boolean;
  quality?: RenderQuality;
};

function seeded(seed: number) {
  return () => {
    let value = seed += 0x6d2b79f5;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function PrecipitationCanvas({
  weather,
  precipitation,
  windSpeed,
  windDirection,
  quiet,
  quality = 'balanced',
}: PrecipitationCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const raining = weather === 'rain' || weather === 'heavy-rain' || weather === 'storm';
    const snowing = weather === 'snow';
    if ((!raining && !snowing) || quiet) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: true, desynchronized: true });
    if (!canvas || !context) return;

    const ctx: CanvasRenderingContext2D = context;
    const rng = seeded(0x71a4c92d);
    let width = 1;
    let height = 1;
    let dpr = 1;
    let frame = 0;
    let hidden = document.hidden;
    let disposed = false;
    let drops: Drop[] = [];
    let lastTime = performance.now();
    let lastDraw = 0;
    const targetFrameMs = quality === 'low' ? 1000 / 24 : 1000 / 30;

    const density = weather === 'storm' || weather === 'heavy-rain'
      ? 1
      : Math.min(0.72, 0.28 + precipitation * 0.12);

    const makeDrops = () => {
      const areaCount = Math.round((width * height) / (quality === 'low' ? 9200 : 7200) * density);
      const count = quality === 'low'
        ? Math.min(150, Math.max(54, areaCount))
        : Math.min(240, Math.max(72, areaCount));
      drops = Array.from({ length: count }, () => ({
        x: rng() * width,
        y: rng() * height,
        depth: 0.3 + rng() * 0.7,
        length: snowing ? 1.2 + rng() * 1.8 : 7 + rng() * 15,
        speed: snowing ? 24 + rng() * 36 : 500 + rng() * 560,
      }));
    };

    const resize = () => {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      dpr = quality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 1.1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeDrops();
    };

    const windRadians = windDirection * Math.PI / 180;
    const wind = Math.sin(windRadians) * Math.min(125, 24 + windSpeed * 2.2);

    function draw(time: number) {
      if (disposed || hidden) {
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(draw);
      if (time - lastDraw < targetFrameMs) return;
      lastDraw = time;

      const elapsed = Math.min(0.06, Math.max(0, (time - lastTime) / 1000));
      lastTime = time;
      ctx.clearRect(0, 0, width, height);

      for (const drop of drops) {
        const speed = drop.speed * drop.depth;
        drop.y += speed * elapsed;
        drop.x += wind * elapsed * drop.depth;
        if (drop.y > height + drop.length || drop.x > width + 30 || drop.x < -30) {
          drop.y = -drop.length - rng() * height * 0.12;
          drop.x = rng() * width;
        }

        if (snowing) {
          ctx.fillStyle = `rgba(245, 250, 255, ${0.18 + drop.depth * 0.36})`;
          ctx.beginPath();
          ctx.arc(drop.x, drop.y, drop.length, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const tailX = drop.x - wind * 0.018 * drop.depth;
          ctx.strokeStyle = `rgba(198, 224, 242, ${0.07 + drop.depth * 0.18})`;
          ctx.lineWidth = 0.4 + drop.depth * 0.72;
          ctx.beginPath();
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(tailX, drop.y - drop.length);
          ctx.stroke();
        }
      }
    }

    const onVisibility = () => {
      hidden = document.hidden;
      lastTime = performance.now();
      if (!hidden && frame === 0) frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    frame = requestAnimationFrame(draw);

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [precipitation, quality, quiet, weather, windDirection, windSpeed]);

  return <canvas ref={canvasRef} className="living-sky__precipitation" aria-hidden="true" />;
}
