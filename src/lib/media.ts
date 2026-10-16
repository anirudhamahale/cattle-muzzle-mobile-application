import { Directory, File, Paths } from 'expo-file-system';

/**
 * Captured images live in the cache until the cattle is saved; they are then
 * copied into documents/cattle/<id>/ so the OS cannot evict them.
 */
function cattleDir(cattleId: string) {
  const dir = new Directory(Paths.document, 'cattle', cattleId);
  dir.create({ idempotent: true, intermediates: true });
  return dir;
}

export async function persistMedia(uri: string, cattleId: string, name: string): Promise<string> {
  const source = new File(uri);
  const ext = source.extension || '.jpg';
  const dest = new File(cattleDir(cattleId), `${name}${ext}`);
  if (dest.exists) dest.delete();
  await source.copy(dest);
  return dest.uri;
}

export function deleteCattleMedia(cattleId: string) {
  const dir = new Directory(Paths.document, 'cattle', cattleId);
  if (dir.exists) dir.delete();
}
