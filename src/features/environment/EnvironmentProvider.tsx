import * as React from 'react';

import { useAcademicTheme } from '@/app/providers/AcademicThemeProvider';
import {
  deriveEnvironment,
  EMPTY_WEATHER,
  locationLabelFromTimezone,
  minutesFromLocalIso,
  weatherFromCode,
} from './environment';

import type { EnvironmentState, WeatherState } from './environment';

const WEATHER_REFRESH_MS = 20 * 60 * 1000;
const WEATHER_CACHE_KEY = 'averiq:living-nature-weather:v1';

const EnvironmentContext = React.createContext<EnvironmentState | null>(null);

type OpenMeteoResponse = {
  timezone?: string;
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    precipitation?: number;
    weather_code?: number;
    cloud_cover?: number;
    visibility?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
  };
  daily?: { sunrise?: string[]; sunset?: string[] };
};

function readCachedWeather(): WeatherState | null {
  try {
    const raw = sessionStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as WeatherState;
    if (!cached.updatedAt || Date.now() - cached.updatedAt > WEATHER_REFRESH_MS * 2) return null;
    return { ...cached, status: 'live' };
  } catch {
    return null;
  }
}

function cacheWeather(weather: WeatherState) {
  try {
    sessionStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(weather));
  } catch {
    // Weather caching is optional; exact coordinates are never stored.
  }
}

async function fetchWeather(latitude: number, longitude: number, signal: AbortSignal): Promise<WeatherState> {
  const query = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current: 'temperature_2m,apparent_temperature,precipitation,weather_code,cloud_cover,visibility,wind_speed_10m,wind_direction_10m',
    daily: 'sunrise,sunset',
    forecast_days: '1',
    timezone: 'auto',
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query.toString()}`, { signal });
  if (!response.ok) throw new Error('Local weather is unavailable');
  const data = await response.json() as OpenMeteoResponse;
  const cloudCover = data.current?.cloud_cover ?? 8;
  const precipitation = data.current?.precipitation ?? 0;
  const timezone = data.timezone ?? null;
  const weather: WeatherState = {
    status: 'live',
    temperature: data.current?.temperature_2m ?? null,
    apparentTemperature: data.current?.apparent_temperature ?? null,
    weather: weatherFromCode(data.current?.weather_code ?? 0, cloudCover, precipitation),
    cloudCover,
    precipitation,
    windSpeed: data.current?.wind_speed_10m ?? 5,
    windDirection: data.current?.wind_direction_10m ?? 250,
    visibility: data.current?.visibility ?? null,
    sunriseMinutes: minutesFromLocalIso(data.daily?.sunrise?.[0]),
    sunsetMinutes: minutesFromLocalIso(data.daily?.sunset?.[0]),
    timezone,
    locationLabel: locationLabelFromTimezone(timezone),
    updatedAt: Date.now(),
  };
  cacheWeather(weather);
  return weather;
}

function useEnvironmentClock() {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 30_000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return now;
}

function useLocalWeather(enabled: boolean): WeatherState {
  const [weather, setWeather] = React.useState<WeatherState>(() => enabled ? readCachedWeather() ?? EMPTY_WEATHER : EMPTY_WEATHER);

  React.useEffect(() => {
    if (!enabled) {
      setWeather(EMPTY_WEATHER);
      return;
    }
    if (!('geolocation' in navigator)) {
      setWeather({ ...EMPTY_WEATHER, status: 'unavailable' });
      return;
    }

    let active = true;
    let refreshTimer = 0;
    let controller: AbortController | null = null;
    let onlineRefresh: (() => void) | null = null;
    setWeather((current) => current.status === 'live' ? current : { ...EMPTY_WEATHER, status: 'locating' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!active) return;
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const refresh = async () => {
          controller?.abort();
          const request = new AbortController();
          controller = request;
          try {
            const next = await fetchWeather(latitude, longitude, request.signal);
            if (active) setWeather(next);
          } catch {
            if (active && !request.signal.aborted) {
              setWeather((current) => current.status === 'live' ? current : { ...EMPTY_WEATHER, status: 'unavailable' });
            }
          }
        };

        void refresh();
        refreshTimer = window.setInterval(() => void refresh(), WEATHER_REFRESH_MS);
        onlineRefresh = () => void refresh();
        window.addEventListener('online', onlineRefresh);
      },
      (error) => {
        if (!active) return;
        setWeather({ ...EMPTY_WEATHER, status: error.code === 1 ? 'denied' : 'unavailable' });
      },
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: WEATHER_REFRESH_MS },
    );

    return () => {
      active = false;
      controller?.abort();
      if (refreshTimer) window.clearInterval(refreshTimer);
      if (onlineRefresh) window.removeEventListener('online', onlineRefresh);
    };
  }, [enabled]);

  return weather;
}

export function EnvironmentProvider({ children }: React.PropsWithChildren) {
  const { preferences } = useAcademicTheme();
  const now = useEnvironmentClock();
  const enabled = preferences.uiStyle === 'living-sky' && preferences.liveWeather;
  const weather = useLocalWeather(enabled);
  const environment = React.useMemo(() => deriveEnvironment(now, weather), [now, weather]);

  return <EnvironmentContext.Provider value={environment}>{children}</EnvironmentContext.Provider>;
}

export function useEnvironment(): EnvironmentState {
  const context = React.useContext(EnvironmentContext);
  if (!context) throw new Error('useEnvironment must be used within EnvironmentProvider');
  return context;
}
