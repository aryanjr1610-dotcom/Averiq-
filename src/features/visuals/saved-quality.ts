import type { Quality } from './types';

export function readVisualQuality(): Quality {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('averiq:visual-preferences:v1') ?? '{}');
    if (typeof value === 'object' && value !== null && 'quality' in value) {
      const quality = value.quality;
      if (quality === 'low' || quality === 'medium' || quality === 'high') return quality;
    }
  } catch { /* Use automatic quality when storage is unavailable. */ }
  return 'auto';
}
