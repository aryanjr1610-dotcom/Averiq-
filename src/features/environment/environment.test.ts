import { describe, expect, it } from 'vitest';

import { deriveEnvironment, EMPTY_WEATHER, weatherFromCode } from './environment';

const luminance = ([red, green, blue]: readonly number[]) => {
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(red!) + 0.7152 * channel(green!) + 0.0722 * channel(blue!);
};

const contrast = (foreground: readonly number[], background: readonly number[]) => {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter! + 0.05) / (darker! + 0.05);
};

describe('living environment', () => {
  it('maps observed weather codes into atmospheric states', () => {
    expect(weatherFromCode(0, 4, 0)).toBe('clear');
    expect(weatherFromCode(2, 60, 0)).toBe('partly-cloudy');
    expect(weatherFromCode(63, 95, 1.2)).toBe('rain');
    expect(weatherFromCode(95, 95, 5)).toBe('storm');
    expect(weatherFromCode(75, 100, 0)).toBe('snow');
  });

  it('uses local sunrise and sunset to place the sun continuously', () => {
    const weather = {
      ...EMPTY_WEATHER,
      status: 'live' as const,
      timezone: 'UTC',
      sunriseMinutes: 360,
      sunsetMinutes: 1080,
    };
    const noon = deriveEnvironment(new Date('2026-09-13T12:00:00Z'), weather);

    expect(noon.phase).toBe('noon');
    expect(noon.sunProgress).toBeCloseTo(0.5, 3);
    expect(noon.nightIntensity).toBeLessThan(0.05);
    expect(noon.starVisibility).toBeLessThan(0.05);
  });

  it('changes adjacent minutes without a palette jump', () => {
    const before = deriveEnvironment(new Date('2026-09-13T17:59:00Z'), {
      ...EMPTY_WEATHER,
      timezone: 'UTC',
      sunriseMinutes: 360,
      sunsetMinutes: 1080,
    });
    const after = deriveEnvironment(new Date('2026-09-13T18:00:00Z'), {
      ...EMPTY_WEATHER,
      timezone: 'UTC',
      sunriseMinutes: 360,
      sunsetMinutes: 1080,
    });

    const largestChannelChange = Math.max(
      ...before.palette.top.map((channel, index) => Math.abs(channel - after.palette.top[index]!)),
      ...before.palette.middle.map((channel, index) => Math.abs(channel - after.palette.middle[index]!)),
      ...before.palette.horizon.map((channel, index) => Math.abs(channel - after.palette.horizon[index]!)),
    );
    expect(largestChannelChange).toBeLessThan(6);
  });

  it('keeps semantic text readable through every day/night transition', () => {
    for (let minute = 0; minute < 1440; minute += 15) {
      const hour = Math.floor(minute / 60).toString().padStart(2, '0');
      const minutePart = (minute % 60).toString().padStart(2, '0');
      const environment = deriveEnvironment(new Date(`2026-09-13T${hour}:${minutePart}:00Z`), {
        ...EMPTY_WEATHER,
        timezone: 'UTC',
        sunriseMinutes: 360,
        sunsetMinutes: 1080,
      });

      expect(contrast(environment.chrome.text, environment.chrome.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(environment.chrome.text, environment.chrome.reading)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(environment.chrome.onAccent, environment.chrome.accent)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
