import { lazy, Suspense } from 'react'
import * as THREE from 'three'
import type { SceneInstance, SceneObject } from '@/features/visuals/three/SceneHost'
import type { Quality, VisualProps } from '@/features/visuals/types'
import type { AnatomyLayer } from '../model'

type Part = { key: string; name: string; layer: AnatomyLayer; mesh: THREE.Mesh }

const COLORS = { deoxy: 0x8c6a78, oxy: 0xa8776f, valve: 0xc9c2b6, vessel: 0x9a8f86 }

function part(key: string, name: string, mesh: THREE.Mesh, layer: AnatomyLayer = 'circulatory'): Part {
  mesh.name = key
  return { key, name, layer, mesh }
}

export type HeartSceneContext = {
  scene: THREE.Scene
  quality?: Quality
}

/**
 * Schematic four-chamber heart from primitives — no external model asset,
 * so nothing unlicensed is bundled. Structure keys match anatomy_structures.object_key.
 */
export const heartSceneFactory = (
  sceneOrContext: THREE.Scene | HeartSceneContext,
  maybeQuality?: Exclude<Quality, 'auto'>,
): SceneInstance => {
  const scene = sceneOrContext instanceof THREE.Scene ? sceneOrContext : sceneOrContext.scene
  const rawQuality = sceneOrContext instanceof THREE.Scene ? maybeQuality : sceneOrContext.quality
  const quality = rawQuality ?? 'medium'
  const segments = quality === 'low' ? 12 : quality === 'high' ? 32 : 20

  const group = new THREE.Group()

  const chamber = (radius: number, color: number) =>
    new THREE.Mesh(
      new THREE.SphereGeometry(radius, segments, segments),
      new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.02 }),
    )
  const tube = (radius: number, height: number, color: number) =>
    new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, segments),
      new THREE.MeshStandardMaterial({ color, roughness: 0.7 }),
    )
  const disc = (radius: number) =>
    new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, 0.06, segments),
      new THREE.MeshStandardMaterial({ color: COLORS.valve, roughness: 0.5 }),
    )

  const parts: Part[] = []

  const ra = chamber(0.52, COLORS.deoxy); ra.position.set(-0.62, 0.5, 0)
  parts.push(part('ra', 'Right atrium', ra))
  const rv = chamber(0.66, COLORS.deoxy); rv.position.set(-0.6, -0.45, 0)
  parts.push(part('rv', 'Right ventricle', rv))
  const la = chamber(0.5, COLORS.oxy); la.position.set(0.62, 0.5, 0)
  parts.push(part('la', 'Left atrium', la))
  const lv = chamber(0.7, COLORS.oxy); lv.position.set(0.6, -0.48, 0)
  lv.scale.set(1, 1.08, 1)
  parts.push(part('lv', 'Left ventricle', lv))

  const tricuspid = disc(0.3); tricuspid.position.set(-0.61, 0.03, 0)
  parts.push(part('tricuspid', 'Tricuspid valve', tricuspid))
  const mitral = disc(0.28); mitral.position.set(0.61, 0.02, 0)
  parts.push(part('mitral', 'Bicuspid (mitral) valve', mitral))

  const vc = tube(0.16, 1.5, COLORS.deoxy); vc.position.set(-1.05, 0.9, 0); vc.rotation.z = 0.25
  parts.push(part('vc', 'Vena cava', vc))
  const pa = tube(0.16, 1.3, COLORS.deoxy); pa.position.set(-0.2, 1.25, 0); pa.rotation.z = -0.4
  parts.push(part('pa', 'Pulmonary artery', pa))
  const pv = tube(0.13, 1.1, COLORS.oxy); pv.position.set(1.02, 0.95, 0); pv.rotation.z = 0.35
  parts.push(part('pv', 'Pulmonary veins', pv))
  const aorta = tube(0.19, 1.6, COLORS.oxy); aorta.position.set(0.25, 1.35, 0); aorta.rotation.z = 0.3
  parts.push(part('aorta', 'Aorta', aorta))

  for (const item of parts) group.add(item.mesh)
  scene.add(group)

  const base = new Map<string, number>()
  for (const item of parts) {
    const material = item.mesh.material as THREE.MeshStandardMaterial
    material.transparent = true
    base.set(item.key, material.opacity)
  }

  const objects: SceneObject[] = parts.map((item) => ({
    id: item.key,
    name: item.name,
    description: () => item.name,
    object: item.mesh,
  }))

  let hiddenLayers = new Set<AnatomyLayer>()
  let emphasis = new Set<string>()
  let isolated: string | null = null

  const apply = () => {
    for (const item of parts) {
      const material = item.mesh.material as THREE.MeshStandardMaterial
      const layerHidden = hiddenLayers.has(item.layer)
      const dimmed = isolated !== null && isolated !== item.key
      const emphasised = emphasis.has(item.key)
      item.mesh.visible = !layerHidden
      material.opacity = dimmed ? 0.12 : emphasised ? 1 : 0.9
      material.emissiveIntensity = emphasised ? 0.35 : 0
      material.emissive = new THREE.Color(emphasised ? 0x33241f : 0x000000)
      material.needsUpdate = true
    }
  }
  apply()

  const setState = (state: Record<string, unknown>) => {
    const layers = state['hiddenLayers']
    const marks = state['emphasis']
    hiddenLayers = new Set(Array.isArray(layers) ? (layers as AnatomyLayer[]) : [])
    emphasis = new Set(Array.isArray(marks) ? (marks as string[]) : [])
    isolated = typeof state['isolated'] === 'string' ? (state['isolated'] as string) : null
    apply()
  }

  return {
    objects,
    update: setState,
    setState,
    dispose: () => {
      for (const item of parts) {
        item.mesh.geometry.dispose()
        const material = item.mesh.material as THREE.MeshStandardMaterial
        material.dispose()
      }
      scene.remove(group)
      base.clear()
    },
  }
}

export default function Heart3D(props: VisualProps) {
  const SceneHost = lazy(() => import('@/features/visuals/three/SceneHost').then((m) => ({ default: m.SceneHost })))
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <SceneHost {...props} factory={heartSceneFactory} />
    </Suspense>
  )
}
