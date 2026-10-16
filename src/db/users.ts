import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { OwnerType, Role, User, UserRow } from './types';

const USER_COLUMNS =
  'id, role, owner_type, name, phone, org_name, registration_no, village, district, state, created_at';

/**
 * Local-only credential hashing. This keeps plain-text passwords off the device,
 * but it is not a substitute for server-side auth — see README "Going to production".
 */
async function hashPassword(password: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '').slice(-10);
}

export type NewUser = {
  role: Role;
  owner_type: OwnerType | null;
  name: string;
  phone: string;
  password: string;
  org_name?: string;
  registration_no?: string;
  village?: string;
  district?: string;
  state?: string;
};

export async function createUser(db: SQLiteDatabase, input: NewUser): Promise<User> {
  const phone = normalizePhone(input.phone);
  const existing = await db.getFirstAsync('SELECT id FROM users WHERE phone = ?', phone);
  if (existing) throw new Error('An account with this phone number already exists.');

  const id = Crypto.randomUUID();
  const salt = Crypto.randomUUID();
  const password_hash = await hashPassword(input.password, salt);
  const created_at = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO users (id, role, owner_type, name, phone, password_hash, salt, org_name,
       registration_no, village, district, state, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.role,
    input.role === 'owner' ? input.owner_type : null,
    input.name.trim(),
    phone,
    password_hash,
    salt,
    input.org_name?.trim() || null,
    input.registration_no?.trim() || null,
    input.village?.trim() || null,
    input.district?.trim() || null,
    input.state?.trim() || null,
    created_at,
  );
  return (await getUser(db, id))!;
}

export async function verifyLogin(
  db: SQLiteDatabase,
  phone: string,
  password: string,
  role: Role,
): Promise<User> {
  const row = await db.getFirstAsync<UserRow>(
    'SELECT * FROM users WHERE phone = ?',
    normalizePhone(phone),
  );
  if (!row || (await hashPassword(password, row.salt)) !== row.password_hash) {
    throw new Error('Incorrect phone number or password.');
  }
  if (row.role !== role) {
    throw new Error(
      `This number is registered as ${row.role === 'doctor' ? 'a doctor' : 'an owner'}. Switch the login type.`,
    );
  }
  const { password_hash: _h, salt: _s, ...user } = row;
  return user;
}

export function getUser(db: SQLiteDatabase, id: string) {
  return db.getFirstAsync<User>(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, id);
}

export function listOwners(db: SQLiteDatabase) {
  return db.getAllAsync<User>(
    `SELECT ${USER_COLUMNS} FROM users WHERE role = 'owner' ORDER BY name COLLATE NOCASE`,
  );
}
