import type { ImageInput, MuzzleDetection, MuzzleEngine } from './types';

/**
 * Stand-in used when no model server is configured, so the capture flow can be
 * exercised end to end. It only performs real resolution checks; the "detection"
 * itself is simulated and it never produces an embedding, so no identity matching
 * happens in demo mode.
 */
const MIN_SIDE_PX = 480;

function stableNoise(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000; // 0–1
}

export const demoEngine: MuzzleEngine = {
  id: 'demo',
  label: 'Demo detector (simulated)',
  isDemo: true,
  async detect({ uri, width, height }: ImageInput): Promise<MuzzleDetection> {
    const issues: string[] = [];
    let confidence = 0.78 + stableNoise(uri) * 0.2;

    const shortSide = Math.min(width, height);
    if (shortSide > 0 && shortSide < MIN_SIDE_PX) {
      issues.push(`Low resolution (${shortSide}px) — move closer or use the camera`);
      confidence -= 0.3;
    }
    return {
      found: true,
      confidence: Math.max(0, Math.min(1, confidence)),
      box: { x: 0.15, y: 0.15, width: 0.7, height: 0.7 },
      issues,
    };
  },
  async embed() {
    return null;
  },
};
