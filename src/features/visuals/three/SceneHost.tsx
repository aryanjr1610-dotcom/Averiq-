import { readVisualQuality } from '../saved-quality';
import { useEffect, useRef, useState } from 'react';

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import type { Parameters, Quality, VisualProps, VisualSelection } from '../types';
import { heartSceneFactory } from '@/features/anatomy/three/heart-scene';

export type SceneObject = {
  id: string;
  name: string;
  description: () => string;
  object: THREE.Object3D;
};

export type SceneInstance = {
  objects: SceneObject[];
  update: ((parameters: Parameters) => void) | ((state: Record<string, unknown>) => void);
  setState?: (state: Record<string, unknown>) => void;
  dispose?: () => void;
};

export type SceneFactory = (
  scene: THREE.Scene,
  quality: Exclude<Quality, 'auto'>,
) => SceneInstance;

export type AnatomySceneHostProps = {
  visualizationId?: string;
  state?: Record<string, unknown>;
  onSelect?: (id: string) => void;
  onError?: () => void;
};

export type SceneHostProps =
  | (VisualProps & { factory: SceneFactory })
  | AnatomySceneHostProps;

function isAnatomyProps(props: SceneHostProps): props is AnatomySceneHostProps {
  return !('factory' in props);
}

function resolvedQuality(quality: Quality): Exclude<Quality, 'auto'> {
  if (quality !== 'auto') return quality;

  const device = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };

  return (
    (device.deviceMemory !== undefined && device.deviceMemory <= 4) ||
    navigator.hardwareConcurrency <= 4 ||
    device.connection?.saveData
  ) ? 'low' : 'medium';
}

function disposeScene(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) return;

    if (object.geometry) geometries.add(object.geometry);

    const values = Array.isArray(object.material)
      ? object.material
      : [object.material];

    for (const material of values) {
      materials.add(material);

      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });

  geometries.forEach((item) => item.dispose());
  materials.forEach((item) => item.dispose());
  textures.forEach((item) => item.dispose());
}

export function SceneHost(props: SceneHostProps) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  live.current = props;

  const isAnatomy = isAnatomyProps(props);

  const api = useRef<{
    update: () => void;
    camera: (preset: string) => void;
  } | null>(null);

  const [failure, setFailure] = useState<Error | null>(null);
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [pan, setPan] = useState(false);
  const panRef = useRef(false);
  panRef.current = pan;

  const [savedQuality] = useState(readVisualQuality);
  const factoryKey = 'factory' in props ? props.factory : props.visualizationId;
  const qualityKey = 'quality' in props ? props.quality : savedQuality;
  const dataKey = 'parameters' in props ? props.parameters : ('state' in props ? props.state : undefined);
  const resetTokenKey = 'resetToken' in props ? props.resetToken : 0;

  useEffect(() => {
    const element = host.current;
    if (!element) return;

    let renderer: THREE.WebGLRenderer | undefined;
    let controls: OrbitControls | undefined;
    let observer: ResizeObserver | undefined;
    let intersection: IntersectionObserver | undefined;
    let scene: THREE.Scene | undefined;
    let frame = 0;
    let inViewport = true;
    let disposed = false;

    const cleanups: Array<() => void> = [];

    try {
      const rawQuality = 'quality' in live.current ? live.current.quality : savedQuality;
      const quality = resolvedQuality(rawQuality);
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: quality !== 'low',
        powerPreference: quality === 'low' ? 'low-power' : 'default',
      });

      renderer.setPixelRatio(Math.min(
        window.devicePixelRatio,
        quality === 'low' ? 1 : quality === 'medium' ? 1.5 : 2,
      ));

      renderer.outputColorSpace = THREE.SRGBColorSpace;
      element.appendChild(renderer.domElement);

      scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 100);
      const activeRenderer = renderer;
      const activeScene = scene;

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = false;
      controls.enablePan = panRef.current;
      controls.minDistance = 1.5;
      controls.maxDistance = 12;

      const activeControls = controls;

      scene.add(new THREE.AmbientLight(0xffffff, 1.8));

      const light = new THREE.DirectionalLight(0xffffff, 2);
      light.position.set(3, 5, 4);
      scene.add(light);

      const factory = 'factory' in live.current ? live.current.factory : heartSceneFactory;
      const instance = factory(scene, quality);
      setObjects(instance.objects);

      const draw = () => {
        if (disposed || document.hidden || !inViewport || frame) return;

        frame = requestAnimationFrame(() => {
          frame = 0;
          if (!disposed) activeRenderer.render(activeScene, camera);
        });
      };

      const preset = (name: string) => {
        camera.up.set(0, 1, 0);

        if (name === 'front') camera.position.set(0, 0, 5);
        else if (name === 'side') camera.position.set(5, 0, 0);
        else if (name === 'top') {
          camera.position.set(0, 5, 0);
          camera.up.set(0, 0, -1);
        } else camera.position.set(3.8, 2.7, 4.2);

        activeControls.target.set(0, 0, 0);
        activeControls.update();
        draw();
      };

      api.current = {
        update() {
          activeControls.enablePan = panRef.current;
          if ('setState' in instance && instance.setState && 'state' in live.current) {
            instance.setState(live.current.state ?? {});
          } else if ('parameters' in live.current) {
            (instance.update as (params: Parameters) => void)(live.current.parameters);
          }
          draw();
        },
        camera: preset,
      };

      api.current.update();
      preset('default');

      observer = new ResizeObserver(() => {
        const width = Math.max(1, element.clientWidth);
        const height = Math.max(1, element.clientHeight);

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        activeRenderer.setSize(width, height, false);
        draw();
      });

      observer.observe(element);

      intersection = new IntersectionObserver(([entry]) => {
        inViewport = entry?.isIntersecting ?? false;
        draw();
      });

      intersection.observe(element);

      const visibility = () => draw();
      document.addEventListener('visibilitychange', visibility);
      cleanups.push(() => document.removeEventListener('visibilitychange', visibility));

      activeControls.addEventListener('change', draw);
      cleanups.push(() => activeControls.removeEventListener('change', draw));

      const lost = (event: Event) => {
        event.preventDefault();
        if (!disposed) {
          if ('onError' in live.current && live.current.onError) {
            live.current.onError();
          } else {
            setFailure(new Error('WebGL context was lost.'));
          }
        }
      };

      activeRenderer.domElement.addEventListener('webglcontextlost', lost);
      cleanups.push(() => activeRenderer.domElement.removeEventListener('webglcontextlost', lost));

      const raycaster = new THREE.Raycaster();
      let pointerStart: { x: number; y: number } | null = null;

      const pointerDown = (event: PointerEvent) => {
        pointerStart = { x: event.clientX, y: event.clientY };
      };

      const pointerUp = (event: PointerEvent) => {
        if (!pointerStart) return;

        const travel = Math.hypot(
          event.clientX - pointerStart.x,
          event.clientY - pointerStart.y,
        );

        pointerStart = null;
        if (travel > 6) return;

        const rectangle = activeRenderer.domElement.getBoundingClientRect();

        raycaster.setFromCamera(new THREE.Vector2(
          (event.clientX - rectangle.left) / rectangle.width * 2 - 1,
          -(event.clientY - rectangle.top) / rectangle.height * 2 + 1,
        ), camera);

        const hits = raycaster.intersectObjects(
          instance.objects.map((item) => item.object),
          true,
        );

        const hit = hits[0]?.object;
        if (!hit) return;

        const selected = instance.objects.find((item) => {
          let current: THREE.Object3D | null = hit;

          while (current) {
            if (current === item.object) return true;
            current = current.parent;
          }

          return false;
        });

        if (selected) {
          if ('onSelect' in live.current && live.current.onSelect) {
            if ('visualizationId' in live.current) {
              (live.current.onSelect as (id: string) => void)(selected.id);
            } else {
              (live.current.onSelect as (val: VisualSelection) => void)({
                id: selected.id,
                name: selected.name,
                description: selected.description(),
              });
            }
          }
        }
      };

      activeRenderer.domElement.addEventListener('pointerdown', pointerDown);
      activeRenderer.domElement.addEventListener('pointerup', pointerUp);

      cleanups.push(() => {
        activeRenderer.domElement.removeEventListener('pointerdown', pointerDown);
        activeRenderer.domElement.removeEventListener('pointerup', pointerUp);
      });
    } catch (error) {
      if ('onError' in live.current && live.current.onError) {
        live.current.onError();
      } else {
        setFailure(error instanceof Error ? error : new Error('3D initialization failed.'));
      }
    }

    return () => {
      disposed = true;
      api.current = null;
      cancelAnimationFrame(frame);
      cleanups.forEach((cleanup) => cleanup());
      observer?.disconnect();
      intersection?.disconnect();
      controls?.dispose();

      if (scene) disposeScene(scene);

      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      }
    };
  }, [factoryKey, qualityKey, savedQuality]);

  useEffect(() => {
    api.current?.update();
  }, [dataKey, pan]);

  useEffect(() => {
    api.current?.camera('default');
  }, [resetTokenKey]);

  if (failure) throw failure;

  function inspect(value: SceneObject) {
    if ('onSelect' in props && props.onSelect) {
      if ('visualizationId' in props) {
        (props.onSelect as (id: string) => void)(value.id);
      } else {
        const selection: VisualSelection = {
          id: value.id,
          name: value.name,
          description: value.description(),
        };
        (props.onSelect as (val: VisualSelection) => void)(selection);
      }
    }
  }

  if (isAnatomy) {
    return (
      <div
        className="three-canvas"
        ref={host}
        role="img"
        aria-label="Interactive 3D anatomy model. Drag to rotate, pinch or scroll to zoom."
      />
    );
  }

  const standardProps = props as VisualProps & { factory: SceneFactory };

  return (
    <div>
      <div
        className="three-canvas"
        ref={host}
        role="img"
        aria-label="Interactive three-dimensional charge model. Drag to rotate and pinch or scroll over the scene to zoom. Keyboard-accessible view controls and object buttons follow."
      />

      <div className="actions">
        {['default', 'front', 'side', 'top'].map((view) => (
          <button
            className="visual-label-button"
            key={view}
            onClick={() => api.current?.camera(view)}
          >
            {view[0]?.toUpperCase()}{view.slice(1)} view
          </button>
        ))}
      </div>

      <label>
        <input type="checkbox" checked={pan} onChange={(event) => setPan(event.target.checked)} />
        {' '}Enable pan
      </label>

      {standardProps.labels && (
        <div className="actions">
          {objects.map((object) => (
            <button
              className="visual-label-button"
              key={object.id}
              onClick={() => inspect(object)}
            >
              Inspect {object.name}
            </button>
          ))}
        </div>
      )}

      <p className="type-caption">
        Rotate inside the scene. Scroll the page outside it. Labels are kept in a readable control row instead of overlapping the model.
      </p>
    </div>
  );
}

export default SceneHost;
