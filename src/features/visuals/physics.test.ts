import { describe, expect, it } from 'vitest';

import {
  COULOMB_K,
  chargePairValues,
  electricField,
} from './physics';

describe('point-charge model', () => {
  it('points away from a positive charge', () => {
    const field = electricField([1, 0, 0], [
      { id: 'a', q: 1e-6, position: [0, 0, 0] },
    ]);

    expect(field?.[0]).toBeCloseTo(COULOMB_K * 1e-6);
    expect(field?.[1]).toBe(0);
  });

  it('points toward a negative charge', () => {
    const field = electricField([1, 0, 0], [
      { id: 'a', q: -1e-6, position: [0, 0, 0] },
    ]);

    expect(field?.[0]).toBeLessThan(0);
  });

  it('cancels at the midpoint between equal positive charges', () => {
    const field = electricField([0, 0, 0], [
      { id: 'a', q: 1e-6, position: [-1, 0, 0] },
      { id: 'b', q: 1e-6, position: [1, 0, 0] },
    ]);

    expect(field?.[0]).toBeCloseTo(0);
  });

  it('does not hide the point-source singularity with a fake finite value', () => {
    expect(electricField([0, 0, 0], [
      { id: 'a', q: 1e-6, position: [0, 0, 0] },
    ])).toBeNull();
  });

  it('matches the reference numerical example', () => {
    const result = chargePairValues([
      { id: 'a', q: 2e-6, position: [0, 0, 0] },
      { id: 'b', q: -3e-6, position: [0.3, 0, 0] },
    ]);

    expect(result?.force).toBeCloseTo(0.59917, 4);
    expect(result?.interaction).toBe('Attractive');
  });
});
