import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { BreedType, HealthStatus, Sex, Species } from '@/constants/cattle';
import { addDays, today } from '@/lib/dates';
import { deleteCattleMedia, persistMedia } from '@/lib/media';
import { cosineSimilarity, MATCH_THRESHOLD, type MuzzleShot } from '@/lib/muzzle';

import type { Cattle, CattleRow, HealthRecord, User } from './types';

const SELECT_CATTLE = `
  SELECT c.*, o.name AS owner_name, o.owner_type AS owner_type, v.name AS verified_by_name
  FROM cattle c
  JOIN users o ON o.id = c.owner_id
  LEFT JOIN users v ON v.id = c.verified_by`;

type JoinedRow = CattleRow & {
  owner_name: string | null;
  owner_type: Cattle['owner_type'];
  verified_by_name: string | null;
};

function fromRow(row: JoinedRow): Cattle {
  return {
    ...row,
    is_pregnant: row.is_pregnant === 1,
    muzzle_photos: JSON.parse(row.muzzle_photos) as MuzzleShot[],
    muzzle_embedding: row.muzzle_embedding ? (JSON.parse(row.muzzle_embedding) as number[]) : null,
  };
}

/** Doctors see every animal; owners see only their own herd. */
function scope(user: User) {
  return user.role === 'doctor'
    ? { where: '1 = 1', params: [] as string[] }
    : { where: 'c.owner_id = ?', params: [user.id] };
}

export type CattleFilter = { search?: string; species?: Species; sex?: Sex; health?: HealthStatus };

export async function listCattle(db: SQLiteDatabase, user: User, filter: CattleFilter = {}) {
  const s = scope(user);
  const clauses = [s.where];
  const params: (string | number)[] = [...s.params];
  if (filter.search?.trim()) {
    const q = `%${filter.search.trim()}%`;
    clauses.push('(c.name LIKE ? OR c.tag_number LIKE ? OR c.breed LIKE ? OR o.name LIKE ?)');
    params.push(q, q, q, q);
  }
  if (filter.species) {
    clauses.push('c.species = ?');
    params.push(filter.species);
  }
  if (filter.sex) {
    clauses.push('c.sex = ?');
    params.push(filter.sex);
  }
  if (filter.health) {
    clauses.push('c.health_status = ?');
    params.push(filter.health);
  }
  const rows = await db.getAllAsync<JoinedRow>(
    `${SELECT_CATTLE} WHERE ${clauses.join(' AND ')} ORDER BY c.created_at DESC`,
    params,
  );
  return rows.map(fromRow);
}

export async function getCattle(db: SQLiteDatabase, id: string) {
  const row = await db.getFirstAsync<JoinedRow>(`${SELECT_CATTLE} WHERE c.id = ?`, id);
  return row ? fromRow(row) : null;
}

export async function getStats(db: SQLiteDatabase, user: User) {
  const s = scope(user);
  const row = await db.getFirstAsync<{
    total: number;
    female: number;
    male: number;
    in_milk: number;
    attention: number;
    verified: number;
    owners: number;
  }>(
    `SELECT COUNT(*) AS total,
       COALESCE(SUM(c.sex = 'female'), 0) AS female,
       COALESCE(SUM(c.sex = 'male'), 0) AS male,
       COALESCE(SUM(c.use_status = 'in_milk'), 0) AS in_milk,
       COALESCE(SUM(c.health_status != 'healthy'), 0) AS attention,
       COALESCE(SUM(c.verified_by IS NOT NULL), 0) AS verified,
       COUNT(DISTINCT c.owner_id) AS owners
     FROM cattle c WHERE ${s.where}`,
    s.params,
  );
  const todayStr = today();
  const inAWeek = addDays(todayStr, 7);
  const due = await db.getAllAsync<HealthRecord & { cattle_name: string | null; tag_number: string | null }>(
    `SELECT h.*, c.name AS cattle_name, c.tag_number
     FROM health_records h JOIN cattle c ON c.id = h.cattle_id
     WHERE ${s.where} AND h.next_due IS NOT NULL AND h.next_due <= ?
     ORDER BY h.next_due ASC LIMIT 5`,
    [...s.params, inAWeek],
  );
  return {
    total: row?.total ?? 0,
    female: row?.female ?? 0,
    male: row?.male ?? 0,
    inMilk: row?.in_milk ?? 0,
    attention: row?.attention ?? 0,
    verified: row?.verified ?? 0,
    owners: row?.owners ?? 0,
    due: due.map((d) => ({ ...d, overdue: (d.next_due ?? '') < todayStr })),
  };
}

export type NewCattle = {
  owner_id: string;
  created_by: string;
  name: string;
  tag_number: string;
  species: Species;
  breed_type: BreedType;
  breed: string;
  sex: Sex;
  age_months: number;
  color_marks: string;
  use_status: string | null;
  is_pregnant: boolean;
  lactation_no: number | null;
  milk_yield_lpd: number | null;
  weight_kg: number | null;
  health_status: HealthStatus;
  village: string;
  district: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  notes: string;
  shots: MuzzleShot[];
  video_uri: string | null;
  body_photo_uri: string | null;
  embedding: number[] | null;
  detector: string;
};

export async function createCattle(db: SQLiteDatabase, input: NewCattle): Promise<string> {
  const id = Crypto.randomUUID();
  const tag = input.tag_number.trim() || null;
  if (tag) {
    const clash = await db.getFirstAsync('SELECT id FROM cattle WHERE tag_number = ?', tag);
    if (clash) throw new Error(`Ear tag ${tag} is already registered.`);
  }

  // Copy media out of the cache first; roll the files back if the insert fails.
  try {
    const shots = await Promise.all(
      input.shots.map(async (s, i) => ({ ...s, uri: await persistMedia(s.uri, id, `muzzle-${i + 1}`) })),
    );
    const video = input.video_uri ? await persistMedia(input.video_uri, id, 'muzzle-video') : null;
    const body = input.body_photo_uri ? await persistMedia(input.body_photo_uri, id, 'body') : null;
    const bestConfidence = Math.max(...shots.map((s) => s.detection.confidence));
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO cattle (id, owner_id, created_by, name, tag_number, species, breed_type, breed, sex,
         age_months, color_marks, use_status, is_pregnant, lactation_no, milk_yield_lpd, weight_kg,
         health_status, village, district, state, latitude, longitude, notes, muzzle_photos,
         muzzle_video, body_photo, muzzle_embedding, muzzle_confidence, detector, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.owner_id,
        input.created_by,
        input.name.trim() || null,
        tag,
        input.species,
        input.breed_type,
        input.breed,
        input.sex,
        input.age_months,
        input.color_marks.trim() || null,
        input.use_status,
        input.is_pregnant ? 1 : 0,
        input.lactation_no,
        input.milk_yield_lpd,
        input.weight_kg,
        input.health_status,
        input.village.trim() || null,
        input.district.trim() || null,
        input.state.trim() || null,
        input.latitude,
        input.longitude,
        input.notes.trim() || null,
        JSON.stringify(shots),
        video,
        body,
        input.embedding ? JSON.stringify(input.embedding) : null,
        bestConfidence,
        input.detector,
        now,
        now,
      ],
    );
  } catch (e) {
    deleteCattleMedia(id);
    throw e;
  }
  return id;
}

export async function deleteCattle(db: SQLiteDatabase, id: string) {
  await db.runAsync('DELETE FROM cattle WHERE id = ?', id);
  deleteCattleMedia(id);
}

export async function setVerified(db: SQLiteDatabase, id: string, doctorId: string | null) {
  await db.runAsync(
    'UPDATE cattle SET verified_by = ?, verified_at = ?, updated_at = ? WHERE id = ?',
    doctorId,
    doctorId ? new Date().toISOString() : null,
    new Date().toISOString(),
    id,
  );
}

/** Compares a muzzle embedding against every enrolled animal. */
export async function findMuzzleMatches(db: SQLiteDatabase, embedding: number[], limit = 3) {
  const rows = await db.getAllAsync<{ id: string; name: string | null; tag_number: string | null; muzzle_embedding: string; owner_name: string }>(
    `SELECT c.id, c.name, c.tag_number, c.muzzle_embedding, o.name AS owner_name
     FROM cattle c JOIN users o ON o.id = c.owner_id WHERE c.muzzle_embedding IS NOT NULL`,
  );
  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      tag_number: r.tag_number,
      owner_name: r.owner_name,
      score: cosineSimilarity(embedding, JSON.parse(r.muzzle_embedding) as number[]),
    }))
    .filter((m) => m.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function listHealthRecords(db: SQLiteDatabase, cattleId: string) {
  return db.getAllAsync<HealthRecord>(
    `SELECT h.*, u.name AS doctor_name FROM health_records h
     JOIN users u ON u.id = h.doctor_id
     WHERE h.cattle_id = ? ORDER BY h.record_date DESC, h.created_at DESC`,
    cattleId,
  );
}

export type NewHealthRecord = {
  cattle_id: string;
  doctor_id: string;
  type: string;
  title: string;
  notes: string;
  record_date: string;
  next_due: string | null;
  health_status: HealthStatus;
};

export async function addHealthRecord(db: SQLiteDatabase, input: NewHealthRecord) {
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO health_records (id, cattle_id, doctor_id, type, title, notes, record_date, next_due, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      Crypto.randomUUID(),
      input.cattle_id,
      input.doctor_id,
      input.type,
      input.title.trim(),
      input.notes.trim() || null,
      input.record_date,
      input.next_due,
      now,
    );
    await db.runAsync(
      'UPDATE cattle SET health_status = ?, updated_at = ? WHERE id = ?',
      input.health_status,
      now,
      input.cattle_id,
    );
  });
}
