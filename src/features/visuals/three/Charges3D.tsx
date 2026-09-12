import * as THREE from 'three';

import SceneHost from './SceneHost';
import type { SceneFactory } from './SceneHost';

import { chargesFromParameters, electricField } from '../physics';
import type { Parameters, VisualProps } from '../types';

const createScene: SceneFactory = (scene, quality) => {
  let parameters: Parameters = {};

  const segments = quality === 'low' ? 12 : quality === 'medium' ? 20 : 28;
  const geometry = new THREE.SphereGeometry(0.09, segments, segments);

  const meshes = [0, 1].map(() => {
    const material = new THREE.MeshStandardMaterial({
      color: 0xa9c4e4,
      roughness: 0.6,
      metalness: 0.05,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    return mesh;
  });

  const spacing = quality === 'low' ? 0.65 : quality === 'medium' ? 0.45 : 0.35;
  const arrows: Array<{ point: readonly [number, number, number]; arrow: THREE.ArrowHelper }> = [];

  for (let x = -1.3; x <= 1.31; x += spacing) {
    for (let y = -0.9; y <= 0.91; y += spacing) {
      for (const z of [-0.6, 0, 0.6]) {
        const point = [x, y, z] as const;
        const arrow = new THREE.ArrowHelper(
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(...point),
          0.16,
          0xa9c4e4,
          0.05,
          0.035,
        );

        scene.add(arrow);
        arrows.push({ point, arrow });
      }
    }
  }

  function update(next: Parameters) {
    parameters = next;
    const charges = chargesFromParameters(parameters);

    charges.forEach((charge, index) => {
      const mesh = meshes[index];
      if (!mesh) return;

      mesh.position.set(...charge.position);
      mesh.material.color.setHex(charge.q > 0 ? 0xe4c99a : charge.q < 0 ? 0xa9c4e4 : 0xa6b3c3);
    });

    for (const { point, arrow } of arrows) {
      const value = electricField(point, charges, 0.16);
      const magnitude = value ? Math.hypot(...value) : 0;

      arrow.visible = magnitude > 1e-10;

      if (value && arrow.visible) {
        arrow.setDirection(new THREE.Vector3(...value).normalize());
      }
    }
  }

  return {
    update,
    objects: meshes.map((object, index) => ({
      id: `charge-${index + 1}`,
      name: `charge ${index + 1}`,
      object,
      description: () => {
        const charge = chargesFromParameters(parameters)[index];

        return charge
          ? `${(charge.q * 1e6).toFixed(1)} μC at (${charge.position.join(', ')}) m. Sign is also available numerically in the controls; color is not the only indication.`
          : 'Charge information unavailable.';
      },
    })),
  };
};

export default function Charges3D(props: VisualProps) {
  return <SceneHost {...props} factory={createScene} />;
}
