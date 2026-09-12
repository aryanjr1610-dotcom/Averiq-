import type { Parameters } from './types';

export type Vector = readonly [number, number, number];
export type Charge = { id: string; q: number; position: Vector };

export const COULOMB_K = 8.9875517923e9;

export function chargesFromParameters(p: Parameters): Charge[] {
  return [
    {
      id: 'charge-1',
      q: (p.q1 ?? 2) * 1e-6,
      position: [p.x1 ?? -0.6, p.y1 ?? 0, 0],
    },
    {
      id: 'charge-2',
      q: (p.q2 ?? -2) * 1e-6,
      position: [p.x2 ?? 0.6, p.y2 ?? 0, 0],
    },
  ];
}

export function electricField(
  point: Vector,
  charges: readonly Charge[],
  excludedRadius = 0,
): Vector | null {
  let x = 0;
  let y = 0;
  let z = 0;

  for (const charge of charges) {
    if (charge.q === 0) continue;

    const dx = point[0] - charge.position[0];
    const dy = point[1] - charge.position[1];
    const dz = point[2] - charge.position[2];
    const distance = Math.hypot(dx, dy, dz);

    if (distance <= excludedRadius || distance === 0) return null;

    const factor = COULOMB_K * charge.q / distance ** 3;
    x += factor * dx;
    y += factor * dy;
    z += factor * dz;
  }

  return [x, y, z];
}

export function chargePairValues(charges: readonly Charge[]) {
  const first = charges[0];
  const second = charges[1];

  if (!first || !second) return null;

  const distance = Math.hypot(
    first.position[0] - second.position[0],
    first.position[1] - second.position[1],
    first.position[2] - second.position[2],
  );

  const product = first.q * second.q;

  return {
    distance,
    force: distance === 0
      ? null
      : COULOMB_K * Math.abs(product) / distance ** 2,
    interaction: product === 0
      ? 'No pair force'
      : product < 0 ? 'Attractive' : 'Repulsive',
  };
}
