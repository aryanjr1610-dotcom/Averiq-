import * as React from 'react';

import { useAcademicTheme } from '@/app/providers/AcademicThemeProvider';

export type SkyPhase = 'dawn' | 'morning' | 'noon' | 'golden' | 'evening' | 'night';
export type SkyWeather = 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';

type WeatherState = {
  temperature: number | null;
  apparentTemperature: number | null;
  weather: SkyWeather;
  cloudCover: number;
  precipitation: number;
  sunriseMinutes: number | null;
  sunsetMinutes: number | null;
};

const EMPTY_WEATHER: WeatherState = {
  temperature: null,
  apparentTemperature: null,
  weather: 'clear',
  cloudCover: 0,
  precipitation: 0,
  sunriseMinutes: null,
  sunsetMinutes: null,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

function minutesFromIso(value?: string): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getHours() * 60 + date.getMinutes();
}

function phaseForTime(now: Date, sunrise: number | null, sunset: number | null): SkyPhase {
  const minute = minutesOfDay(now);
  const rise = sunrise ?? 390;
  const set = sunset ?? 1110;

  if (minute < rise - 35 || minute >= set + 70) return 'night';
  if (minute < rise + 35) return 'dawn';
  if (minute < 660) return 'morning';
  if (minute < set - 105) return 'noon';
  if (minute < set + 10) return 'golden';
  return 'evening';
}

function weatherFromCode(code: number, cloudCover: number, precipitation: number): SkyWeather {
  if ([95, 96, 99].includes(code)) return 'storm';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([45, 48].includes(code)) return 'fog';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code) || precipitation > 0.05) return 'rain';
  if ([1, 2, 3].includes(code) || cloudCover > 38) return 'cloudy';
  return 'clear';
}

function wellbeingTip(weather: WeatherState): string | null {
  const apparent = weather.apparentTemperature ?? weather.temperature;

  if (weather.weather === 'storm') return 'Stormy weather nearby — stay indoors when conditions become unsafe and keep study breaks calm.';
  if (weather.weather === 'rain') return 'Rain around you — keep an umbrella handy and protect books or devices when heading out.';
  if (weather.weather === 'snow') return 'Cold, snowy conditions — wear warm layers when you go outside.';
  if (apparent !== null && apparent >= 32) return 'It feels hot outside — keep water nearby and take comfortable breaks in a cooler place.';
  if (apparent !== null && apparent <= 16) return 'It feels cool outside — a warm layer or blanket can make study time more comfortable.';
  if (weather.cloudCover < 20) return 'Clear skies — a short stretch or fresh-air break can be a nice reset between study sessions.';
  return null;
}

function useClock(): Date {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

function useLocalWeather(enabled: boolean): WeatherState {
  const [weather, setWeather] = React.useState<WeatherState>(EMPTY_WEATHER);

  React.useEffect(() => {
    if (!enabled || !('geolocation' in navigator)) {
      setWeather(EMPTY_WEATHER);
      return;
    }

    let active = true;
    const controller = new AbortController();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const query = new URLSearchParams({
          latitude: latitude.toFixed(4),
          longitude: longitude.toFixed(4),
          current: 'temperature_2m,apparent_temperature,precipitation,weather_code,cloud_cover',
          daily: 'sunrise,sunset',
          forecast_days: '1',
          timezone: 'auto',
        });

        void fetch(`https://api.open-meteo.com/v1/forecast?${query.toString()}`, { signal: controller.signal })
          .then((response) => {
            if (!response.ok) throw new Error('weather unavailable');
            return response.json() as Promise<{
              current?: {
                temperature_2m?: number;
                apparent_temperature?: number;
                precipitation?: number;
                weather_code?: number;
                cloud_cover?: number;
              };
              daily?: { sunrise?: string[]; sunset?: string[] };
            }>;
          })
          .then((data) => {
            if (!active) return;
            const cloudCover = data.current?.cloud_cover ?? 0;
            const precipitation = data.current?.precipitation ?? 0;
            const code = data.current?.weather_code ?? 0;
            setWeather({
              temperature: data.current?.temperature_2m ?? null,
              apparentTemperature: data.current?.apparent_temperature ?? null,
              weather: weatherFromCode(code, cloudCover, precipitation),
              cloudCover,
              precipitation,
              sunriseMinutes: minutesFromIso(data.daily?.sunrise?.[0]),
              sunsetMinutes: minutesFromIso(data.daily?.sunset?.[0]),
            });
          })
          .catch(() => {
            if (active) setWeather(EMPTY_WEATHER);
          });
      },
      () => {
        if (active) setWeather(EMPTY_WEATHER);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 30 * 60 * 1000 },
    );

    return () => {
      active = false;
      controller.abort();
    };
  }, [enabled]);

  return weather;
}

export function LivingSky({
  lowPowerMode,
  surface,
}: {
  lowPowerMode: boolean;
  surface: 'app' | 'reading' | 'immersive';
}) {
  const { preferences, reducedMotion } = useAcademicTheme();
  const now = useClock();
  const live = preferences.uiStyle === 'living-sky';
  const weather = useLocalWeather(live && preferences.liveWeather);
  const phase = phaseForTime(now, weather.sunriseMinutes, weather.sunsetMinutes);
  const minute = minutesOfDay(now);
  const dayProgress = minute / 1440;
  const rise = weather.sunriseMinutes ?? 390;
  const set = weather.sunsetMinutes ?? 1110;
  const sunProgress = clamp((minute - rise) / Math.max(1, set - rise), 0, 1);
  const moonProgress = minute >= set ? clamp((minute - set) / Math.max(1, 1440 - set + rise), 0, 1) : clamp((minute + (1440 - set)) / Math.max(1, 1440 - set + rise), 0, 1);
  const tip = preferences.liveWeather ? wellbeingTip(weather) : null;
  const quiet = lowPowerMode || reducedMotion || surface !== 'app';

  if (!live || surface === 'immersive') return null;

  const style = {
    '--sky-day-progress': dayProgress,
    '--sky-sun-progress': sunProgress,
    '--sky-moon-progress': moonProgress,
    '--sky-cloud-cover': weather.cloudCover / 100,
  } as React.CSSProperties;

  return (
    <div
      className="living-sky"
      data-phase={phase}
      data-weather={preferences.liveWeather ? weather.weather : 'clear'}
      data-quiet={quiet ? 'true' : 'false'}
      style={style}
      aria-hidden="true"
    >
      <div className="living-sky__gradient" />
      <div className="living-sky__haze" />
      <div className="living-sky__stars living-sky__stars--a" />
      <div className="living-sky__stars living-sky__stars--b" />
      <div className="living-sky__shooting-star living-sky__shooting-star--one" />
      <div className="living-sky__shooting-star living-sky__shooting-star--two" />
      <div className="living-sky__sun" />
      <div className="living-sky__moon"><span /></div>
      <div className="living-sky__cloud living-sky__cloud--one" />
      <div className="living-sky__cloud living-sky__cloud--two" />
      <div className="living-sky__cloud living-sky__cloud--three" />
      <div className="living-sky__rain" />
      <div className="living-sky__lightning" />
      <div className="living-sky__vignette" />
      {tip ? <div className="living-sky__tip" role="status">{tip}</div> : null}
    </div>
  );
}
