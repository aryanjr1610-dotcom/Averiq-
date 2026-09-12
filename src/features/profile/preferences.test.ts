import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, visualPreferencesFromSettings } from './preferences';

describe('settings to visual-system preferences', () => {
  it('maps reduced motion to the value consumed by CSS, Framer Motion and Anatomy', () => {
    const visual = visualPreferencesFromSettings({
      ...DEFAULT_PREFERENCES,
      accessibility: { motion: 'reduced', largerText: true },
      appearance: { mode: 'light', atmosphere: 'reduced', visualQuality: 'low' },
    });
    expect(visual).toEqual({ mode: 'light', motion: 'reduce', decoration: 'minimal', largerText: true });
  });

  it('turns decoration off in minimal mode while retaining system motion preference', () => {
    expect(visualPreferencesFromSettings({
      ...DEFAULT_PREFERENCES,
      appearance: { ...DEFAULT_PREFERENCES.appearance, atmosphere: 'minimal' },
    })).toMatchObject({ decoration: 'off', motion: 'system' });
  });
});
