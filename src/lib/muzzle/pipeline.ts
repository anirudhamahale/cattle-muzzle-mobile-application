import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { createVideoPlayer, type VideoPlayer, type VideoThumbnail } from 'expo-video';

import { muzzleEngine } from './index';
import { isUsableShot, type Box, type MuzzleShot } from './types';

const MAX_SIDE = 1280;
const VIDEO_SAMPLE_COUNT = 6;
const VIDEO_KEEP_BEST = 3;
const VIDEO_LOAD_TIMEOUT_MS = 10_000;

/**
 * Where the on-screen muzzle guide sits, normalised to the camera preview.
 * The preview is aspect-filled ("cover"), so the guide is mapped back to sensor
 * pixels before cropping. Padding keeps a slightly misaligned muzzle in frame.
 */
export type GuideMapping = { preview: { width: number; height: number }; guide: Box };

const GUIDE_PADDING = 0.08;

export function guideToCropRect(mapping: GuideMapping, imageW: number, imageH: number) {
  const { preview, guide } = mapping;
  const scale = Math.max(preview.width / imageW, preview.height / imageH);
  const offsetX = (imageW * scale - preview.width) / 2;
  const offsetY = (imageH * scale - preview.height) / 2;

  const padX = guide.width * GUIDE_PADDING;
  const padY = guide.height * GUIDE_PADDING;
  const left = ((guide.x - padX) * preview.width + offsetX) / scale;
  const top = ((guide.y - padY) * preview.height + offsetY) / scale;
  const width = ((guide.width + padX * 2) * preview.width) / scale;
  const height = ((guide.height + padY * 2) * preview.height) / scale;

  const originX = Math.max(0, Math.round(left));
  const originY = Math.max(0, Math.round(top));
  return {
    originX,
    originY,
    width: Math.min(imageW - originX, Math.round(width)),
    height: Math.min(imageH - originY, Math.round(height)),
  };
}

/** Optionally crop to the guide, downscale, and write a JPEG. */
type ManipulatorSource = Parameters<typeof ImageManipulator.manipulate>[0];

async function renderImage(
  source: string | VideoThumbnail,
  width: number,
  height: number,
  guide?: GuideMapping,
) {
  // VideoThumbnail and the manipulator declare SharedRef from differently-resolved copies of
  // expo-modules-core; at runtime both are the same native image ref.
  const ctx = ImageManipulator.manipulate(source as ManipulatorSource);
  let w = width;
  let h = height;
  if (guide && width > 0 && height > 0) {
    const rect = guideToCropRect(guide, width, height);
    ctx.crop(rect);
    w = rect.width;
    h = rect.height;
  }
  if (Math.max(w, h) > MAX_SIDE) {
    ctx.resize(w >= h ? { width: MAX_SIDE, height: null } : { width: null, height: MAX_SIDE });
  }
  const ref = await ctx.renderAsync();
  const saved = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
  ref.release();
  ctx.release();
  return saved;
}

async function toShot(
  uri: string,
  width: number,
  height: number,
  source: MuzzleShot['source'],
): Promise<MuzzleShot> {
  const detection = await muzzleEngine.detect({ uri, width, height });
  return { uri, width, height, source, detection };
}

export async function processPhoto(
  input: { uri: string; width: number; height: number },
  source: 'camera' | 'gallery',
  guide?: GuideMapping,
): Promise<MuzzleShot> {
  const img = await renderImage(input.uri, input.width, input.height, guide);
  return toShot(img.uri, img.width, img.height, source);
}

function waitUntilReady(player: VideoPlayer) {
  if (player.status === 'readyToPlay') return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      sub.remove();
      reject(new Error('Video took too long to load.'));
    }, VIDEO_LOAD_TIMEOUT_MS);
    const sub = player.addListener('statusChange', ({ status, error }) => {
      if (status === 'readyToPlay' || status === 'error') {
        clearTimeout(timer);
        sub.remove();
        if (status === 'error') reject(new Error(error?.message ?? 'Could not open the video.'));
        else resolve();
      }
    });
  });
}

/**
 * Samples frames across a muzzle video, runs detection on each and keeps the
 * best few. A short slow pan over the muzzle gives several usable angles at once.
 */
export async function processVideo(
  uri: string,
  guide?: GuideMapping,
  onProgress?: (done: number, total: number) => void,
): Promise<MuzzleShot[]> {
  const player = createVideoPlayer(uri);
  try {
    await waitUntilReady(player);
    const duration = player.duration > 0 ? player.duration : 3;
    const times = Array.from(
      { length: VIDEO_SAMPLE_COUNT },
      (_, i) => duration * (0.1 + (0.8 * i) / (VIDEO_SAMPLE_COUNT - 1)),
    );
    const thumbs = await player.generateThumbnailsAsync(times, { maxWidth: 1920, maxHeight: 1920 });

    const shots: MuzzleShot[] = [];
    for (let i = 0; i < thumbs.length; i++) {
      const t = thumbs[i];
      const img = await renderImage(t, t.width, t.height, guide);
      shots.push(await toShot(img.uri, img.width, img.height, 'video'));
      onProgress?.(i + 1, thumbs.length);
    }
    return shots
      .filter(isUsableShot)
      .sort((a, b) => b.detection.confidence - a.detection.confidence)
      .slice(0, VIDEO_KEEP_BEST);
  } finally {
    player.release();
  }
}
