import { afterEach, describe, expect, it, vi } from 'vitest';
import { readVisualQuality } from './saved-quality';

afterEach(() => vi.unstubAllGlobals());

describe('saved rendering quality', () => {
  it('uses the low-power preference selected in Settings', () => {
    vi.stubGlobal('localStorage', { getItem: () => '{"quality":"low","mode":"dark"}' });
    expect(readVisualQuality()).toBe('low');
  });

  it.each(['{"quality":"invalid"}', 'null', '{', '{}'])('falls back for invalid saved data: %s', (raw) => {
    vi.stubGlobal('localStorage', { getItem: () => raw });
    expect(readVisualQuality()).toBe('auto');
  });

  it('remains usable when storage is blocked', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Unavailable'); } });
    expect(readVisualQuality()).toBe('auto');
  });
});
