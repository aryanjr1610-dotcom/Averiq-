export type ModelAsset = {
  id: string;
  path: string;
  licenseReference: string;
  credit: string;
  maximumBytes: number;
};

export async function loadCuratedModel(
  asset: ModelAsset,
  signal: AbortSignal,
  onProgress?: (loaded: number, total: number | null) => void,
) {
  const url = new URL(asset.path, window.location.origin);

  if (
    url.origin !== window.location.origin ||
    !url.pathname.startsWith('/models/') ||
    !/\.(glb|gltf)$/i.test(url.pathname)
  ) {
    throw new Error('Only registered same-origin model assets are supported.');
  }

  const [{ GLTFLoader }, { LoadingManager }] = await Promise.all([
    import('three/addons/loaders/GLTFLoader.js'),
    import('three'),
  ]);

  const response = await fetch(url, { signal });
  if (!response.ok || !response.body) throw new Error('Model download failed.');

  const declared = Number(response.headers.get('content-length'));
  const total = Number.isFinite(declared) && declared > 0 ? declared : null;

  if (total && total > asset.maximumBytes) throw new Error('Model exceeds its size limit.');

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;

      loaded += item.value.byteLength;

      if (loaded > asset.maximumBytes) {
        await reader.cancel();
        throw new Error('Model exceeds its size limit.');
      }

      chunks.push(item.value);
      onProgress?.(loaded, total);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(loaded);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const manager = new LoadingManager();
  const directory = new URL('.', url);

  manager.setURLModifier((resource) => {
    if (/^data:(?:image\/(?:png|jpeg|webp)|application\/octet-stream);base64,/i.test(resource)) {
      return resource;
    }

    const resolved = new URL(resource, directory);

    if (
      resolved.origin !== url.origin ||
      !resolved.pathname.startsWith(directory.pathname)
    ) {
      throw new Error('Model dependency is outside its approved directory.');
    }

    return resolved.href;
  });

  signal.throwIfAborted();

  const loader = new GLTFLoader(manager);
  return loader.parseAsync(bytes.buffer, directory.href);
}
