import * as React from 'react';

import { clamp } from '@/features/environment/environment';
import type { SkyWeather } from '@/features/environment/environment';

type NatureSceneCanvasProps = {
  weather: SkyWeather;
  cloudCover: number;
  windSpeed: number;
  windDirection: number;
  nightIntensity: number;
  goldenHourIntensity: number;
  twilightIntensity: number;
  horizonGlow: number;
  quiet: boolean;
};

type CloudSeed = {
  x: number;
  y: number;
  scale: number;
  depth: number;
  width: number;
  puffs: Array<{ x: number; y: number; r: number }>;
};

type GrassBlade = {
  x: number;
  height: number;
  width: number;
  lean: number;
  phase: number;
  depth: number;
};

function seeded(seed: number) {
  return () => {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildCloudSeeds() {
  const rng = seeded(0x77a92041);
  return Array.from({ length: 14 }, (_, index): CloudSeed => {
    const depth = index < 5 ? 0.35 : index < 10 ? 0.62 : 0.92;
    const width = 230 + rng() * 310;
    const puffs = Array.from({ length: 15 + Math.round(rng() * 12) }, () => ({
      x: (rng() - 0.5) * width * 0.9,
      y: (rng() - 0.5) * 80 - 12,
      r: 34 + rng() * 74,
    }));
    return {
      x: rng() * 1.35 - 0.18,
      y: 0.08 + rng() * 0.52,
      scale: 0.55 + rng() * 0.8,
      depth,
      width,
      puffs,
    };
  });
}

function buildGrass(count: number) {
  const rng = seeded(0x4927f13a);
  return Array.from({ length: count }, (_, index): GrassBlade => {
    const depth = 0.35 + (index % 11) / 14 + rng() * 0.22;
    return {
      x: rng(),
      height: 28 + rng() * 92 * depth,
      width: 0.65 + rng() * 1.8 * depth,
      lean: (rng() - 0.5) * 11,
      phase: rng() * Math.PI * 2,
      depth,
    };
  });
}

function cloudStrength(weather: SkyWeather, cover: number) {
  const base = clamp(cover / 100, 0.03, 1);
  if (weather === 'storm') return Math.max(base, 0.94);
  if (weather === 'heavy-rain') return Math.max(base, 0.86);
  if (weather === 'rain') return Math.max(base, 0.7);
  if (weather === 'fog') return Math.max(base, 0.74);
  if (weather === 'snow') return Math.max(base, 0.68);
  if (weather === 'cloudy') return Math.max(base, 0.76);
  if (weather === 'partly-cloudy') return Math.max(base, 0.42);
  if (weather === 'mostly-clear') return Math.max(base, 0.18);
  return Math.min(base, 0.12);
}

function weatherDarkness(weather: SkyWeather) {
  if (weather === 'storm') return 0.7;
  if (weather === 'heavy-rain') return 0.56;
  if (weather === 'rain') return 0.34;
  if (weather === 'cloudy') return 0.18;
  if (weather === 'fog') return 0.08;
  if (weather === 'snow') return 0.06;
  return 0;
}

export function NatureSceneCanvas({
  weather,
  cloudCover,
  windSpeed,
  windDirection,
  nightIntensity,
  goldenHourIntensity,
  twilightIntensity,
  horizonGlow,
  quiet,
}: NatureSceneCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const clouds = React.useMemo(buildCloudSeeds, []);
  const grass = React.useMemo(() => buildGrass(520), []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let disposed = false;
    let hidden = document.hidden;
    const windRadians = (windDirection * Math.PI) / 180;
    const windSign = Math.sin(windRadians) >= 0 ? 1 : -1;
    const strength = cloudStrength(weather, cloudCover);
    const darkness = weatherDarkness(weather);

    const resize = () => {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawCloud = (cloud: CloudSeed, time: number) => {
      const speed = quiet ? 0 : (0.0012 + windSpeed * 0.00008) * cloud.depth * windSign;
      const travel = quiet ? 0 : time * speed;
      const span = width + cloud.width * 2;
      let x = cloud.x * span + travel;
      x = ((x % span) + span) % span - cloud.width;
      const y = cloud.y * height;
      const scale = cloud.scale * (0.72 + cloud.depth * 0.5);
      const alpha = strength * (0.2 + cloud.depth * 0.42);
      if (alpha < 0.015) return;

      context.save();
      context.translate(x, y);
      context.scale(scale, scale);
      context.globalCompositeOperation = weather === 'storm' || weather === 'heavy-rain' || weather === 'rain' ? 'source-over' : 'screen';
      context.filter = `blur(${Math.round(12 + (1 - cloud.depth) * 11)}px)`;

      for (const puff of cloud.puffs) {
        const radius = puff.r;
        const glow = context.createRadialGradient(puff.x, puff.y, radius * 0.08, puff.x, puff.y, radius);
        if (weather === 'storm' || weather === 'heavy-rain') {
          glow.addColorStop(0, `rgba(42, 56, 70, ${alpha * 0.9})`);
          glow.addColorStop(0.56, `rgba(30, 43, 56, ${alpha * 0.6})`);
          glow.addColorStop(1, 'rgba(17, 28, 40, 0)');
        } else if (weather === 'rain' || weather === 'cloudy') {
          glow.addColorStop(0, `rgba(160, 177, 188, ${alpha * 0.72})`);
          glow.addColorStop(0.58, `rgba(112, 133, 149, ${alpha * 0.48})`);
          glow.addColorStop(1, 'rgba(82, 105, 125, 0)');
        } else {
          const warm = goldenHourIntensity * 0.65;
          glow.addColorStop(0, `rgba(${Math.round(228 + warm * 24)}, ${Math.round(235 - warm * 20)}, ${Math.round(241 - warm * 48)}, ${alpha})`);
          glow.addColorStop(0.58, `rgba(202, 216, 228, ${alpha * 0.5})`);
          glow.addColorStop(1, 'rgba(182, 204, 220, 0)');
        }
        context.fillStyle = glow;
        context.beginPath();
        context.arc(puff.x, puff.y, radius, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    };

    const drawHorizon = () => {
      const horizonY = height * 0.82;
      const haze = context.createLinearGradient(0, horizonY - height * 0.13, 0, height);
      haze.addColorStop(0, `rgba(220, 224, 214, ${0.02 + horizonGlow * 0.07})`);
      haze.addColorStop(0.52, `rgba(54, 68, 59, ${0.08 + darkness * 0.11})`);
      haze.addColorStop(1, `rgba(5, 11, 10, ${0.56 + nightIntensity * 0.3})`);
      context.fillStyle = haze;
      context.fillRect(0, horizonY - height * 0.13, width, height * 0.18);

      context.beginPath();
      context.moveTo(0, horizonY + 14);
      for (let x = 0; x <= width + 20; x += 20) {
        const y = horizonY + Math.sin(x * 0.008) * 6 + Math.sin(x * 0.021) * 3;
        context.lineTo(x, y);
      }
      context.lineTo(width, height);
      context.lineTo(0, height);
      context.closePath();
      const ground = context.createLinearGradient(0, horizonY, 0, height);
      const dayGreen = 0.18 * (1 - nightIntensity);
      ground.addColorStop(0, `rgba(${Math.round(35 + goldenHourIntensity * 34)}, ${Math.round(53 + dayGreen * 75)}, 38, ${0.62 + darkness * 0.2})`);
      ground.addColorStop(1, `rgba(3, 9, 8, ${0.92 + nightIntensity * 0.06})`);
      context.fillStyle = ground;
      context.fill();
    };

    const drawGrass = (time: number) => {
      const baseY = height + 4;
      const windAmount = clamp(windSpeed / 32, 0.06, 1);
      const weatherBoost = weather === 'storm' ? 1.65 : weather === 'heavy-rain' ? 1.35 : weather === 'rain' ? 1.15 : 1;
      const gust = quiet ? 0 : Math.sin(time * 0.00038) * 0.45 + Math.sin(time * 0.00091) * 0.2;
      const warm = goldenHourIntensity;

      for (const blade of grass) {
        const x = blade.x * width;
        const bladeHeight = blade.height * (0.72 + blade.depth * 0.46);
        const sway = quiet
          ? blade.lean * 0.3
          : windSign * (5 + windAmount * 17 * weatherBoost) * blade.depth + Math.sin(time * 0.0012 + blade.phase) * (2.2 + windAmount * 5.5) + gust * 8;
        const tipX = x + blade.lean + sway;
        const tipY = baseY - bladeHeight;
        const controlX = x + sway * 0.38;
        const controlY = baseY - bladeHeight * 0.52;

        const daylight = 1 - nightIntensity;
        const red = Math.round(11 + daylight * 16 + warm * 25);
        const green = Math.round(25 + daylight * 37 + warm * 17);
        const blue = Math.round(20 + daylight * 10);
        const alpha = 0.42 + blade.depth * 0.45;

        context.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
        context.lineWidth = blade.width;
        context.lineCap = 'round';
        context.beginPath();
        context.moveTo(x, baseY);
        context.quadraticCurveTo(controlX, controlY, tipX, tipY);
        context.stroke();
      }
    };

    const drawFog = () => {
      if (weather !== 'fog') return;
      const fog = context.createLinearGradient(0, height * 0.46, 0, height * 0.92);
      fog.addColorStop(0, 'rgba(218, 228, 230, 0)');
      fog.addColorStop(0.45, 'rgba(218, 228, 230, 0.2)');
      fog.addColorStop(1, 'rgba(205, 217, 219, 0.38)');
      context.fillStyle = fog;
      context.fillRect(0, height * 0.42, width, height * 0.55);
    };

    const draw = (time: number) => {
      if (disposed || hidden) {
        frame = 0;
        return;
      }
      context.clearRect(0, 0, width, height);
      clouds.forEach((cloud) => drawCloud(cloud, time));
      drawFog();
      drawHorizon();
      drawGrass(time);
      if (!quiet) frame = requestAnimationFrame(draw);
      else frame = 0;
    };

    const onVisibility = () => {
      hidden = document.hidden;
      if (!hidden && !quiet && frame === 0) frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    draw(performance.now());

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [cloudCover, clouds, goldenHourIntensity, grass, horizonGlow, nightIntensity, quiet, twilightIntensity, weather, windDirection, windSpeed]);

  return <canvas ref={canvasRef} className="living-sky__nature" aria-hidden="true" />;
}
