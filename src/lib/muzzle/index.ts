import { demoEngine } from './demo-engine';
import { createRemoteEngine } from './remote-engine';
import type { MuzzleEngine } from './types';

const apiUrl = process.env.EXPO_PUBLIC_MUZZLE_API_URL?.trim();

export const muzzleEngine: MuzzleEngine = apiUrl ? createRemoteEngine(apiUrl) : demoEngine;

/** Cosine similarity at or above this means "same animal". Tune per model. */
export const MATCH_THRESHOLD = Number(process.env.EXPO_PUBLIC_MUZZLE_MATCH_THRESHOLD) || 0.85;

export function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** Element-wise mean of several shot embeddings, giving one template per animal. */
export function averageEmbedding(embeddings: number[][]): number[] | null {
  const valid = embeddings.filter((e) => e.length > 0 && e.length === embeddings[0].length);
  if (valid.length === 0) return null;
  const out = new Array<number>(valid[0].length).fill(0);
  for (const e of valid) for (let i = 0; i < e.length; i++) out[i] += e[i] / valid.length;
  return out;
}

export * from './types';
