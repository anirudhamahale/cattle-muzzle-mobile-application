import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { useSQLiteContext } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import type { Role, User } from '@/db/types';
import { createUser, getUser, verifyLogin, type NewUser } from '@/db/users';
import { captureStore } from '@/lib/capture-store';

/**
 * Logged-in state follows the same shape as the grievance app's authContext:
 * an `auth-key` flag in AsyncStorage-style storage plus a credential (here the
 * user id, kept in SecureStore like the grievance token), `isReady` while it is
 * restored, and logIn/logOut that navigate with router.replace.
 */
SplashScreen.preventAutoHideAsync();

export const AuthStorageKey = 'auth-key';
export const SessionStorageKey = 'auth-session';
export const OnboardingStorageKey = 'onboarding-complete';

type AuthState = {
  isReady: boolean;
  isLoggedIn: boolean;
  hasSeenOnboarding: boolean;
  user: User | null;
  /** Last signed-in user; stays set through the render that follows logOut. */
  lastUser: User | null;
  logIn: (phone: string, password: string, role: Role) => Promise<void>;
  register: (input: NewUser) => Promise<void>;
  logOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
};

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [lastUser, setLastUser] = useState<User | null>(null);

  const storeAuthState = async (u: User) => {
    await Storage.setItem(AuthStorageKey, JSON.stringify({ isLoggedIn: true }));
    await SecureStore.setItemAsync(SessionStorageKey, u.id);
  };

  const clearAuthState = async () => {
    await Storage.removeItem(AuthStorageKey);
    await SecureStore.deleteItemAsync(SessionStorageKey);
    captureStore.reset();
    setUser(null);
  };

  const startSession = async (u: User) => {
    await storeAuthState(u);
    setUser(u);
    setLastUser(u);
    setIsLoggedIn(true);
    router.replace('/home');
  };

  const logIn = async (phone: string, password: string, role: Role) =>
    startSession(await verifyLogin(db, phone, password, role));

  const register = async (input: NewUser) => startSession(await createUser(db, input));

  const logOut = async () => {
    await clearAuthState();
    setIsLoggedIn(false);
    router.replace('/auth/login');
  };

  const completeOnboarding = async () => {
    await Storage.setItem(OnboardingStorageKey, 'true');
    setHasSeenOnboarding(true);
    router.replace('/auth/login');
  };

  useEffect(() => {
    const getAuthFromStorage = async () => {
      try {
        const [authValue, userId, onboarding] = await Promise.all([
          Storage.getItem(AuthStorageKey),
          SecureStore.getItemAsync(SessionStorageKey),
          Storage.getItem(OnboardingStorageKey),
        ]);
        setHasSeenOnboarding(onboarding === 'true');
        // Both pieces must exist, and the account must still be on this device.
        const restored = authValue && userId ? await getUser(db, userId) : null;
        setUser(restored);
        setLastUser(restored);
        setIsLoggedIn(!!restored);
      } catch (error) {
        console.warn('Error restoring auth state', error);
        setIsLoggedIn(false);
      }
      setIsReady(true);
    };
    getAuthFromStorage();
  }, [db]);

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync();
  }, [isReady]);

  return (
    <AuthContext
      value={{ isReady, isLoggedIn, hasSeenOnboarding, user, lastUser, logIn, register, logOut, completeOnboarding }}>
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/**
 * For screens inside the protected (app) group, whose layout redirects when
 * logged out. Uses the last signed-in user so screens survive the single render
 * between logOut and their unmount.
 */
export function useCurrentUser(): User {
  const { lastUser } = useAuth();
  if (!lastUser) throw new Error('No signed-in user');
  return lastUser;
}
