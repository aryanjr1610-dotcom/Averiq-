export type SkyPhase =
  | 'deep-night'
  | 'pre-dawn'
  | 'dawn'
  | 'morning'
  | 'late-morning'
  | 'noon'
  | 'afternoon'
  | 'golden-hour'
  | 'sunset'
  | 'twilight'
  | 'blue-hour'
  | 'night';

export type SkyWeather =
  | 'clear'
  | 'mostly-clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'rain'
  | 'heavy-rain'
  | 'storm'
  | 'fog'
  | 'snow';

export type WeatherStatus = 'idle' | 'locating' | 'live' | 'denied' | 'unavailable';
export type Rgb = readonly [number, number, number];

export type WeatherState = {
  status: WeatherStatus;
  temperature: number | null;
  apparentTemperature: number | null;
  weather: SkyWeather;
  cloudCover: number;
  precipitation: number;
  windSpeed: number;
  windDirection: number;
  visibility: number | null;
  sunriseMinutes: number | null;
  sunsetMinutes: number | null;
  timezone: string | null;
  locationLabel: string | null;
  updatedAt: number | null;
};

export type EnvironmentPalette = {
  top: Rgb;
  middle: Rgb;
  horizon: Rgb;
  glow: Rgb;
};

export type EnvironmentChrome = {
  canvas: Rgb;
  surface: Rgb;
  raised: Rgb;
  interactive: Rgb;
  reading: Rgb;
  text: Rgb;
  secondaryText: Rgb;
  tertiaryText: Rgb;
  border: Rgb;
  accent: Rgb;
  accentHover: Rgb;
  onAccent: Rgb;
  shadow: Rgb;
  surfaceAlpha: number;
};

export type EnvironmentState = WeatherState & {
  now: Date;
  minuteOfDay: number;
  dayProgress: number;
  phase: SkyPhase;
  phaseLabel: string;
  conditionLabel: string;
  sunProgress: number;
  sunAltitude: number;
  moonProgress: number;
  nightIntensity: number;
  goldenHourIntensity: number;
  twilightIntensity: number;
  starVisibility: number;
  moonVisibility: number;
  horizonGlow: number;
  palette: EnvironmentPalette;
  chrome: EnvironmentChrome;
};

export const EMPTY_WEATHER: WeatherState = {
  status: 'idle',
  temperature: null,
  apparentTemperature: null,
  weather: 'clear',
  cloudCover: 8,
  precipitation: 0,
  windSpeed: 5,
  windDirection: 250,
  visibility: null,
  sunriseMinutes: null,
  sunsetMinutes: null,
  timezone: null,
  locationLabel: null,
  updatedAt: null,
};

const PHASE_LABELS: Record<SkyPhase, string> = {
  'deep-night': 'Deep night',
  'pre-dawn': 'Pre-dawn',
  dawn: 'Dawn',
  morning: 'Morning light',
  'late-morning': 'Late morning',
  noon: 'Daylight',
  afternoon: 'Afternoon',
  'golden-hour': 'Golden hour',
  sunset: 'Sunset',
  twilight: 'Twilight',
  'blue-hour': 'Blue hour',
  night: 'Night',
};

const WEATHER_LABELS: Record<SkyWeather, string> = {
  clear: 'Clear',
  'mostly-clear': 'Mostly clear',
  'partly-cloudy': 'Partly cloudy',
  cloudy: 'Cloudy',
  rain: 'Rain',
  'heavy-rain': 'Heavy rain',
  storm: 'Thunderstorm',
  fog: 'Fog',
  snow: 'Snow',
};

type PaletteStop = EnvironmentPalette & { minute: number };

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / Math.max(1, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function mixNumber(a: number, b: number, amount: number): number {
  return a + (b - a) * clamp(amount);
}

export function mixRgb(a: Rgb, b: Rgb, amount: number): Rgb {
  return [
    Math.round(mixNumber(a[0], b[0], amount)),
    Math.round(mixNumber(a[1], b[1], amount)),
    Math.round(mixNumber(a[2], b[2], amount)),
  ];
}

export function rgbChannels(value: Rgb): string {
  return `${value[0]} ${value[1]} ${value[2]}`;
}

function relativeLuminance([red, green, blue]: Rgb): number {
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function contrastRatio(foreground: Rgb, background: Rgb): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function minutesFromLocalIso(value?: string): number | null {
  if (!value) return null;
  const match = value.match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesOfDay(date: Date, timezone?: string | null): number {
  if (!timezone) return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;

  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return Number(value.hour) * 60 + Number(value.minute) + Number(value.second) / 60;
  } catch {
    return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  }
}

export function locationLabelFromTimezone(timezone?: string | null): string | null {
  if (!timezone) return null;
  const segment = timezone.split('/').at(-1);
  return segment ? segment.replaceAll('_', ' ') : null;
}

export function weatherFromCode(code: number, cloudCover: number, precipitation: number): SkyWeather {
  if ([95, 96, 99].includes(code)) return 'storm';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([45, 48].includes(code)) return 'fog';
  if ([65, 67, 82].includes(code) || precipitation >= 4) return 'heavy-rain';
  if ([51, 53, 55, 56, 57, 61, 63, 66, 80, 81].includes(code) || precipitation > 0.05) return 'rain';
  if (code === 3 || cloudCover >= 82) return 'cloudy';
  if (code === 2 || cloudCover >= 48) return 'partly-cloudy';
  if (code === 1 || cloudCover >= 20) return 'mostly-clear';
  return 'clear';
}

function phaseForMinute(minute: number, rise: number, set: number): SkyPhase {
  const solarNoon = (rise + set) / 2;
  if (minute < rise - 105) return 'deep-night';
  if (minute < rise - 48) return 'pre-dawn';
  if (minute < rise + 28) return 'dawn';
  if (minute < rise + 145) return 'morning';
  if (minute < solarNoon - 55) return 'late-morning';
  if (minute < solarNoon + 70) return 'noon';
  if (minute < set - 95) return 'afternoon';
  if (minute < set - 20) return 'golden-hour';
  if (minute < set + 24) return 'sunset';
  if (minute < set + 58) return 'twilight';
  if (minute < set + 105) return 'blue-hour';
  if (minute < 1380) return 'night';
  return 'deep-night';
}

function paletteStops(rise: number, set: number): PaletteStop[] {
  const solarNoon = (rise + set) / 2;
  const stops: PaletteStop[] = [
    { minute: 0, top: [2, 7, 19], middle: [5, 18, 42], horizon: [11, 42, 65], glow: [126, 170, 209] },
    { minute: rise - 105, top: [5, 15, 36], middle: [20, 32, 61], horizon: [75, 64, 85], glow: [190, 127, 111] },
    { minute: rise - 48, top: [35, 49, 88], middle: [139, 89, 113], horizon: [232, 151, 111], glow: [255, 194, 139] },
    { minute: rise + 24, top: [83, 132, 171], middle: [205, 155, 126], horizon: [247, 207, 164], glow: [255, 224, 175] },
    { minute: rise + 135, top: [86, 153, 199], middle: [143, 190, 218], horizon: [220, 231, 223], glow: [255, 235, 184] },
    { minute: solarNoon, top: [35, 112, 177], middle: [87, 165, 213], horizon: [209, 230, 235], glow: [255, 243, 206] },
    { minute: set - 165, top: [52, 115, 167], middle: [112, 162, 190], horizon: [207, 211, 193], glow: [255, 215, 161] },
    { minute: set - 62, top: [58, 77, 124], middle: [185, 104, 97], horizon: [245, 161, 99], glow: [255, 158, 77] },
    { minute: set, top: [37, 45, 82], middle: [143, 72, 91], horizon: [225, 119, 84], glow: [255, 145, 78] },
    { minute: set + 38, top: [16, 27, 57], middle: [59, 46, 81], horizon: [134, 70, 91], glow: [215, 112, 95] },
    { minute: set + 78, top: [6, 18, 40], middle: [15, 42, 72], horizon: [46, 70, 99], glow: [135, 162, 195] },
    { minute: Math.min(1438, set + 112), top: [2, 9, 23], middle: [6, 23, 47], horizon: [13, 47, 71], glow: [124, 173, 211] },
    { minute: 1440, top: [2, 7, 19], middle: [5, 18, 42], horizon: [11, 42, 65], glow: [126, 170, 209] },
  ];
  return stops.sort((a, b) => a.minute - b.minute);
}

function interpolatePalette(minute: number, stops: PaletteStop[]): EnvironmentPalette {
  const nextIndex = Math.max(1, stops.findIndex((stop) => stop.minute >= minute));
  const before = stops[nextIndex - 1] ?? stops[0]!;
  const after = stops[nextIndex] ?? stops.at(-1)!;
  const progress = clamp((minute - before.minute) / Math.max(1, after.minute - before.minute));
  return {
    top: mixRgb(before.top, after.top, progress),
    middle: mixRgb(before.middle, after.middle, progress),
    horizon: mixRgb(before.horizon, after.horizon, progress),
    glow: mixRgb(before.glow, after.glow, progress),
  };
}

function pulse(value: number, center: number, radius: number): number {
  return clamp(1 - Math.abs(value - center) / radius);
}

function buildChrome(night: number, golden: number, twilight: number, palette: EnvironmentPalette): EnvironmentChrome {
  const darkAmount = smoothstep(0.18, 0.72, clamp(night + twilight * 0.24));
  const daySurface: Rgb = [246, 249, 247];
  const nightSurface: Rgb = [6, 20, 37];
  const dayText: Rgb = [17, 31, 42];
  const nightText: Rgb = [241, 247, 252];
  const warmAccent: Rgb = [151, 77, 50];
  const daylightAccent: Rgb = [31, 83, 117];
  const moonAccent: Rgb = [151, 204, 241];
  const darkMode = darkAmount >= 0.46;
  const baseAccent = mixRgb(daylightAccent, moonAccent, darkAmount);
  const accent = mixRgb(baseAccent, warmAccent, golden * (1 - darkAmount * 0.45));
  const lightOnAccent: Rgb = [255, 255, 255];
  const darkOnAccent: Rgb = [0, 0, 0];
  const onAccent = contrastRatio(lightOnAccent, accent) >= contrastRatio(darkOnAccent, accent)
    ? lightOnAccent
    : darkOnAccent;
  const surface = darkMode ? nightSurface : daySurface;
  const text = darkMode ? nightText : dayText;
  return {
    canvas: mixRgb(palette.middle, palette.top, 0.62),
    surface,
    raised: darkMode ? [10, 31, 49] : [252, 253, 249],
    interactive: darkMode ? [18, 43, 64] : [226, 237, 238],
    reading: darkMode ? [9, 25, 41] : [255, 254, 248],
    text,
    secondaryText: darkMode ? [183, 207, 225] : [62, 79, 89],
    tertiaryText: darkMode ? [145, 174, 197] : [86, 103, 111],
    border: mixRgb(darkMode ? [177, 216, 245] : [34, 70, 89], palette.glow, 0.12),
    accent,
    accentHover: mixRgb(accent, darkMode ? [217, 237, 250] : [8, 42, 66], 0.18),
    onAccent,
    shadow: darkMode ? [0, 7, 18] : [30, 54, 64],
    surfaceAlpha: darkMode ? 0.58 : 0.72,
  };
}

export function deriveEnvironment(now: Date, weather: WeatherState): EnvironmentState {
  const rise = weather.sunriseMinutes ?? 390;
  const set = weather.sunsetMinutes ?? 1110;
  const minute = minutesOfDay(now, weather.timezone);
  const sunProgress = clamp((minute - rise) / Math.max(1, set - rise));
  const sunAltitude = Math.max(-0.18, Math.sin(sunProgress * Math.PI));
  const moonWindow = Math.max(1, 1440 - set + rise);
  const moonProgress = minute >= set
    ? clamp((minute - set) / moonWindow)
    : clamp((minute + 1440 - set) / moonWindow);
  const morningNight = minute < rise + 25 ? 1 - smoothstep(rise - 110, rise + 25, minute) : 0;
  const eveningNight = minute > set - 30 ? smoothstep(set - 30, set + 105, minute) : 0;
  const nightIntensity = clamp(Math.max(morningNight, eveningNight));
  const goldenHourIntensity = Math.max(pulse(minute, rise + 5, 82), pulse(minute, set - 34, 92));
  const twilightIntensity = Math.max(pulse(minute, rise - 48, 70), pulse(minute, set + 34, 76));
  const cloudFactor = clamp(weather.cloudCover / 100);
  const starVisibility = clamp(nightIntensity * (1 - cloudFactor * 0.8));
  const moonVisibility = clamp(nightIntensity * (1 - cloudFactor * 0.62));
  const horizonGlow = clamp(goldenHourIntensity * 0.88 + twilightIntensity * 0.5 + nightIntensity * 0.13);
  const palette = interpolatePalette(minute, paletteStops(rise, set));
  const phase = phaseForMinute(minute, rise, set);

  return {
    ...weather,
    now,
    minuteOfDay: minute,
    dayProgress: minute / 1440,
    phase,
    phaseLabel: PHASE_LABELS[phase],
    conditionLabel: WEATHER_LABELS[weather.weather],
    sunProgress,
    sunAltitude,
    moonProgress,
    nightIntensity,
    goldenHourIntensity,
    twilightIntensity,
    starVisibility,
    moonVisibility,
    horizonGlow,
    palette,
    chrome: buildChrome(nightIntensity, goldenHourIntensity, twilightIntensity, palette),
  };
}

export function environmentTip(weather: WeatherState, phase: SkyPhase): string | null {
  const apparent = weather.apparentTemperature ?? weather.temperature;
  if (weather.weather === 'storm') return 'Stormy conditions nearby — stay somewhere safe and comfortable.';
  if (weather.weather === 'heavy-rain' || weather.weather === 'rain') return 'Rain nearby — keep your books and devices dry.';
  if (weather.weather === 'snow' || (apparent !== null && apparent <= 16)) return 'A little cool outside — make your study space comfortable.';
  if (apparent !== null && apparent >= 32) return 'Warm outside — keep some water nearby.';
  if ((phase === 'night' || phase === 'blue-hour') && weather.cloudCover < 20) {
    return 'Clear skies tonight — a short outdoor break could be refreshing.';
  }
  return null;
}
