/** Normalised (0–1) bounding box relative to the image. */
export type Box = { x: number; y: number; width: number; height: number };

export type MuzzleDetection = {
  found: boolean;
  /** 0–1 */
  confidence: number;
  box: Box | null;
  /** Human-readable quality problems, e.g. "Image is blurry". */
  issues: string[];
};

export type MuzzleShot = {
  uri: string;
  width: number;
  height: number;
  source: 'camera' | 'video' | 'gallery';
  detection: MuzzleDetection;
};

export type ImageInput = { uri: string; width: number; height: number };

/**
 * A muzzle engine detects the muzzle in an image and (optionally) produces an
 * embedding — a numeric fingerprint of the muzzle print used to identify the animal.
 */
export interface MuzzleEngine {
  id: string;
  label: string;
  /** True when results are simulated; the UI shows a warning banner. */
  isDemo: boolean;
  detect(image: ImageInput): Promise<MuzzleDetection>;
  embed(image: ImageInput): Promise<number[] | null>;
}

/** A shot must reach this confidence to count towards registration. */
export const MIN_SHOT_CONFIDENCE = 0.6;
/** Shots needed before a cattle can be saved, and the number we ask for. */
export const MIN_SHOTS = 1;
export const RECOMMENDED_SHOTS = 3;

export const isUsableShot = (s: MuzzleShot) =>
  s.detection.found && s.detection.confidence >= MIN_SHOT_CONFIDENCE;
