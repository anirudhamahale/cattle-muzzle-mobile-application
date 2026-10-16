import * as SecureStore from 'expo-secure-store';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Role, User } from '@/db/types';
import { createUser, getUser, verifyLogin, type NewUser } from '@/db/users';
import { captureStore } from '@/lib/capture-store';

const SESSION_KEY = 'session.userId';

type AuthContextValue = {
  user: User | null;
  /** Last signed-in user; stays set through the render that follows sign-out. */
  lastUser: User | null;
  ready: boolean;
  signIn: (phone: string, password: string, role: Role) => Promise<void>;
  signUp: (input: NewUser) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [user, setUser] = useState<User | null>(null);
  const [lastUser, setLastUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const id = await SecureStore.getItemAsync(SESSION_KEY);
        const restored = id ? await getUser(db, id) : null;
        setUser(restored);
        setLastUser(restored);
      } finally {
        setReady(true);
      }
    })();
  }, [db]);

  const startSession = useCallback(async (u: User) => {
    await SecureStore.setItemAsync(SESSION_KEY, u.id);
    setUser(u);
    setLastUser(u);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      lastUser,
      ready,
      signIn: async (phone, password, role) => startSession(await verifyLogin(db, phone, password, role)),
      signUp: async (input) => startSession(await createUser(db, input)),
      signOut: async () => {
        await SecureStore.deleteItemAsync(SESSION_KEY);
        captureStore.reset();
        setUser(null);
      },
    }),
    [db, user, lastUser, ready, startSession],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/**
 * For screens inside the protected (app) group. Uses the last signed-in user so
 * screens survive the single render between sign-out and their unmount.
 */
export function useCurrentUser(): User {
  const { lastUser } = useAuth();
  if (!lastUser) throw new Error('No signed-in user');
  return lastUser;
}
