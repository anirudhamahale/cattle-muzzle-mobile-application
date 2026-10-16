import type { Box, ImageInput, MuzzleDetection, MuzzleEngine } from './types';

/**
 * Talks to a muzzle-recognition model server. Contract (see README):
 *
 *   POST {base}/v1/muzzle/detect  multipart "image" -> { found, confidence, box?, issues? }
 *   POST {base}/v1/muzzle/embed   multipart "image" -> { embedding: number[] }
 */
const TIMEOUT_MS = 20_000;

type DetectResponse = {
  found: boolean;
  confidence: number;
  box?: Box | null;
  issues?: string[];
};

async function postImage<T>(url: string, image: ImageInput): Promise<T> {
  const form = new FormData();
  // React Native's FormData accepts a { uri, name, type } file descriptor.
  form.append('image', { uri: image.uri, name: 'muzzle.jpg', type: 'image/jpeg' } as unknown as Blob);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: 'POST', body: form, signal: controller.signal });
    if (!res.ok) throw new Error(`Muzzle service responded ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export function createRemoteEngine(baseUrl: string): MuzzleEngine {
  const base = baseUrl.replace(/\/+$/, '');
  return {
    id: 'remote',
    label: 'Muzzle model (server)',
    isDemo: false,
    async detect(image): Promise<MuzzleDetection> {
      const r = await postImage<DetectResponse>(`${base}/v1/muzzle/detect`, image);
      return {
        found: Boolean(r.found),
        confidence: Math.max(0, Math.min(1, Number(r.confidence) || 0)),
        box: r.box ?? null,
        issues: r.issues ?? [],
      };
    },
    async embed(image) {
      const r = await postImage<{ embedding?: number[] }>(`${base}/v1/muzzle/embed`, image);
      return Array.isArray(r.embedding) && r.embedding.length > 0 ? r.embedding : null;
    },
  };
}
