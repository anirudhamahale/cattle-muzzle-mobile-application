import { useSyncExternalStore } from 'react';

import type { MuzzleShot } from './muzzle/types';

/**
 * Hands muzzle shots from the full-screen camera back to the registration form.
 * Route params can't carry arrays of objects cleanly, so this tiny store does.
 */
type CaptureState = { shots: MuzzleShot[]; videoUri: string | null };

let state: CaptureState = { shots: [], videoUri: null };
const listeners = new Set<() => void>();

function set(next: Partial<CaptureState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export const captureStore = {
  addShots(shots: MuzzleShot[]) {
    set({ shots: [...state.shots, ...shots] });
  },
  removeShot(uri: string) {
    set({ shots: state.shots.filter((s) => s.uri !== uri) });
  },
  setVideo(videoUri: string | null) {
    set({ videoUri });
  },
  reset() {
    set({ shots: [], videoUri: null });
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCapture() {
  return useSyncExternalStore(subscribe, () => state);
}
