import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'pashu-muzzle.db';
const DATABASE_VERSION = 1;

/** Runs from <SQLiteProvider onInit>, before any screen renders. */
export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= DATABASE_VERSION) return;

  if (version === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('doctor', 'owner')),
        owner_type TEXT CHECK (owner_type IN ('gaushala', 'farmer')),
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        org_name TEXT,
        registration_no TEXT,
        village TEXT,
        district TEXT,
        state TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cattle (
        id TEXT PRIMARY KEY NOT NULL,
        owner_id TEXT NOT NULL REFERENCES users(id),
        created_by TEXT NOT NULL REFERENCES users(id),
        name TEXT,
        tag_number TEXT UNIQUE,
        species TEXT NOT NULL,
        breed_type TEXT NOT NULL,
        breed TEXT NOT NULL,
        sex TEXT NOT NULL,
        age_months INTEGER NOT NULL,
        color_marks TEXT,
        use_status TEXT,
        is_pregnant INTEGER NOT NULL DEFAULT 0,
        lactation_no INTEGER,
        milk_yield_lpd REAL,
        weight_kg REAL,
        health_status TEXT NOT NULL DEFAULT 'healthy',
        village TEXT,
        district TEXT,
        state TEXT,
        latitude REAL,
        longitude REAL,
        notes TEXT,
        muzzle_photos TEXT NOT NULL,
        muzzle_video TEXT,
        body_photo TEXT,
        muzzle_embedding TEXT,
        muzzle_confidence REAL,
        detector TEXT,
        verified_by TEXT REFERENCES users(id),
        verified_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_cattle_owner ON cattle(owner_id);

      CREATE TABLE IF NOT EXISTS health_records (
        id TEXT PRIMARY KEY NOT NULL,
        cattle_id TEXT NOT NULL REFERENCES cattle(id) ON DELETE CASCADE,
        doctor_id TEXT NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        notes TEXT,
        record_date TEXT NOT NULL,
        next_due TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_health_cattle ON health_records(cattle_id);
    `);
    version = 1;
  }

  // Future migrations: if (version === 1) { ...; version = 2; }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
