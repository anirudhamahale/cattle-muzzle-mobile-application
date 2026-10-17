import type { SQLiteDatabase } from 'expo-sqlite';

import { createUser, type NewUser } from './users';

/** Test logins, created only in development builds (__DEV__). Never shipped in release. */
export const DEV_ACCOUNTS: (NewUser & { label: string })[] = [
  {
    label: 'Doctor',
    role: 'doctor',
    owner_type: null,
    name: 'Test Doctor',
    phone: '9999999999',
    password: '123456',
    registration_no: 'TEST-VET-001',
    org_name: 'Test Veterinary Hospital',
  },
  {
    label: 'User',
    role: 'owner',
    owner_type: 'farmer',
    name: 'Test Farmer',
    phone: '8888888888',
    password: '123456',
  },
];

export async function seedDevAccounts(db: SQLiteDatabase) {
  if (!__DEV__) return;
  for (const account of DEV_ACCOUNTS) {
    const exists = await db.getFirstAsync('SELECT id FROM users WHERE phone = ?', account.phone);
    if (!exists) await createUser(db, account);
  }
}
