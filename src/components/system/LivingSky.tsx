import * as React from 'react';

import { useAcademicTheme } from '@/app/providers/AcademicThemeProvider';
import { NightSkyCanvas } from '@/components/system/NightSkyCanvas';
import { PrecipitationCanvas } from '@/components/system/PrecipitationCanvas';
import { useEnvironment } from '@/features/environment/EnvironmentProvider';
import { clamp, rgbChannels } from '@/features/environment/environment';

import type { SkyWeather } from '@/features/environment/environment';

const ROOT_ENV_PROPERTIES = [
  '--canvas',
  '--surface-base',
  '--surface-raised',
  '--surface-interactive',
  '--surface-reading',
  '--surface-overlay',
  '--text-primary',
  '--text-secondary',
  '--text-tertiary',
  '--text-onaccent',
  '--border-subtle',
  '--border-default',
  '--border-strong',
  '--accent',
  '--accent-hover',
  '--accent-text',
  '--focus-ring',
  '--glass-tint',
  '--glass-alpha',
  '--shadow-1',
  '--shadow-2',
  '--shadow-3',
] as const;

function cloudOpacity(weather: SkyWeather, cover: number): number {
  const observed = clamp(cover / 100, 0.04, 1);
  if (weather === 'storm') return Math.max(observed, 0.88);
  if (weather === 'heavy-rain') return Math.max(observed, 0.8);
  if (weather === 'rain') return Math.max(observed, 0.65);
  if (weather === 'fog') return Math.max(observed, 0.72);
  if (weather === 'snow') return Math.max(observed, 0.62);
  if (weather === 'cloudy') return Math.max(observed, 0.7);
  if (weather === 'partly-cloudy') return Math.max(observed, 0.38);
  if (weather === 'mostly-clear') return Math.max(observed, 0.16);
  return Math.min(observed, 0.12);
}

function StormLight({ active }: { active: boolean }) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!active || !element) return;
    let timer = 0;
    let disposed = false;

    const schedule = () => {
      if (disposed) return;
      timer = window.setTimeout(() => {
        if (document.hidden) {
          schedule();
          return;
        }
        const animation = element.animate(
          [
            { opacity: 0 },
            { opacity: 0.3, offset: 0.1 },
            { opacity: 0.04, offset: 0.23 },
            { opacity: 0.18, offset: 0.34 },
            { opacity: 0 },
          ],
          { duration: 920, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
        );
        animation.onfinish = schedule;
        animation.oncancel = schedule;
      }, 18_000 + Math.random() * 30_000);
    };

    schedule();
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      element.getAnimations().forEach((animation) => animation.cancel());
    };
  }, [active]);

  return <div ref={ref} className="living-sky__lightning" aria-hidden="true" />;
}

export function LivingSky({
  lowPowerMode,
  surface,
}: {
  lowPowerMode: boolean;
  surface: 'app' | 'reading' | 'immersive';
}) {
  const { preferences, reducedMotion } = useAcademicTheme();
  const environment = useEnvironment();
  const live = preferences.uiStyle === 'living-sky';
  const quiet = lowPowerMode || reducedMotion || surface !== 'app';
  const cover = cloudOpacity(environment.weather, environment.cloudCover);
  const isPrecipitating = ['rain', 'heavy-rain', 'storm', 'snow'].includes(environment.weather);
  const sunX = 6 + environment.sunProgress * 88;
  const sunY = 78 - Math.sin(environment.sunProgress * Math.PI) * 65;
  const moonX = 7 + environment.moonProgress * 86;
  const moonY = 80 - Math.sin(environment.moonProgress * Math.PI) * 62;
  const horizontalWind = -Math.sin(environment.windDirection * Math.PI / 180);
  const cloudDirection = horizontalWind < 0 ? -1 : 1;
  const cloudDuration = clamp(210 - environment.windSpeed * 4.2, 72, 210);
  const previousRootValues = React.useRef<Map<string, string> | null>(null);
  const previousMetaTheme = React.useRef<string | null>(null);

  React.useLayoutEffect(() => {
    if (!live) return;
    const root = document.documentElement;
    previousRootValues.current = new Map(ROOT_ENV_PROPERTIES.map((property) => [property, root.style.getPropertyValue(property)]));
    previousMetaTheme.current = document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null;

    return () => {
      for (const property of ROOT_ENV_PROPERTIES) {
        const previous = previousRootValues.current?.get(property) ?? '';
        if (previous) root.style.setProperty(property, previous);
        else root.style.removeProperty(property);
      }
      if (previousMetaTheme.current) {
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', previousMetaTheme.current);
      }
      delete root.dataset.skyPhase;
      delete root.dataset.skyWeather;
      delete root.dataset.skyLight;
      delete root.dataset.weatherStatus;
      previousRootValues.current = null;
    };
  }, [live]);

  React.useLayoutEffect(() => {
    if (!live) return;
    const root = document.documentElement;
    const { chrome } = environment;
    const shadow = rgbChannels(chrome.shadow);
    const values: Record<(typeof ROOT_ENV_PROPERTIES)[number], string> = {
      '--canvas': rgbChannels(chrome.canvas),
      '--surface-base': rgbChannels(chrome.surface),
      '--surface-raised': rgbChannels(chrome.raised),
      '--surface-interactive': rgbChannels(chrome.interactive),
      '--surface-reading': rgbChannels(chrome.reading),
      '--surface-overlay': rgbChannels(chrome.raised),
      '--text-primary': rgbChannels(chrome.text),
      '--text-secondary': rgbChannels(chrome.secondaryText),
      '--text-tertiary': rgbChannels(chrome.tertiaryText),
      '--text-onaccent': rgbChannels(chrome.onAccent),
      '--border-subtle': rgbChannels(chrome.border),
      '--border-default': rgbChannels(chrome.border),
      '--border-strong': rgbChannels(chrome.border),
      '--accent': rgbChannels(chrome.accent),
      '--accent-hover': rgbChannels(chrome.accentHover),
      '--accent-text': rgbChannels(chrome.accent),
      '--focus-ring': rgbChannels(chrome.accent),
      '--glass-tint': rgbChannels(chrome.surface),
      '--glass-alpha': String(chrome.surfaceAlpha),
      '--shadow-1': `0 1px 3px rgb(${shadow} / .16)`,
      '--shadow-2': `0 12px 36px -16px rgb(${shadow} / .32)`,
      '--shadow-3': `0 24px 72px -24px rgb(${shadow} / .46)`,
    };

    for (const [property, value] of Object.entries(values)) root.style.setProperty(property, value);
    root.dataset.skyPhase = environment.phase;
    root.dataset.skyWeather = environment.weather;
    root.dataset.skyLight = environment.nightIntensity > 0.46 ? 'dark' : 'light';
    root.dataset.weatherStatus = environment.status;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', `rgb(${rgbChannels(environment.palette.top)})`);
  }, [environment, live]);

  if (!live || surface === 'immersive') return null;

  const style = {
    '--sky-top-color': `rgb(${rgbChannels(environment.palette.top)})`,
    '--sky-mid-color': `rgb(${rgbChannels(environment.palette.middle)})`,
    '--sky-horizon-color': `rgb(${rgbChannels(environment.palette.horizon)})`,
    '--sky-glow-color': `rgb(${rgbChannels(environment.palette.glow)})`,
    '--sky-sun-x': `${sunX}%`,
    '--sky-sun-y': `${sunY}%`,
    '--sky-sun-opacity': clamp((1 - environment.nightIntensity) * (1 - cover * 0.56)),
    '--sky-moon-x': `${moonX}%`,
    '--sky-moon-y': `${moonY}%`,
    '--sky-moon-opacity': environment.moonVisibility,
    '--sky-star-opacity': environment.starVisibility,
    '--sky-cloud-opacity': cover,
    '--sky-horizon-glow': environment.horizonGlow,
    '--sky-night-intensity': environment.nightIntensity,
    '--sky-golden-intensity': environment.goldenHourIntensity,
    '--sky-twilight-intensity': environment.twilightIntensity,
    '--sky-weather-dim': clamp(cover * 0.24 + (isPrecipitating ? 0.16 : 0)),
    '--sky-cloud-start': cloudDirection > 0 ? '-72vw' : '108vw',
    '--sky-cloud-travel': `${cloudDirection * 190}vw`,
    '--sky-cloud-quiet-position': `${cloudDirection * 54}vw`,
    '--sky-cloud-far-duration': `${Math.round(cloudDuration * 1.34)}s`,
    '--sky-cloud-mid-duration': `${Math.round(cloudDuration)}s`,
    '--sky-cloud-near-duration': `${Math.round(cloudDuration * 0.78)}s`,
  } as React.CSSProperties;

  return (
    <div
      className="living-sky"
      data-phase={environment.phase}
      data-weather={environment.weather}
      data-quiet={quiet ? 'true' : 'false'}
      style={style}
    >
      <div className="living-sky__visuals" aria-hidden="true">
        <div className="living-sky__gradient" />
        <div className="living-sky__airglow" />
        <div className="living-sky__haze" />
        <NightSkyCanvas
          visibility={environment.starVisibility}
          quiet={quiet}
          cloudCover={cover}
        />
        <div className="living-sky__sun" />
        <div className="living-sky__moon"><span /></div>
        <div className="living-sky__cloud living-sky__cloud--far" />
        <div className="living-sky__cloud living-sky__cloud--mid" />
        <div className="living-sky__cloud living-sky__cloud--near" />
        <PrecipitationCanvas
          weather={environment.weather}
          precipitation={environment.precipitation}
          windSpeed={environment.windSpeed}
          windDirection={environment.windDirection}
          quiet={quiet}
        />
        <StormLight active={environment.weather === 'storm' && !quiet} />
        <div className="living-sky__horizon" />
        <div className="living-sky__foreground" />
        <div className="living-sky__vignette" />
        <div className="living-sky__grain" />
      </div>
    </div>
  );
}
