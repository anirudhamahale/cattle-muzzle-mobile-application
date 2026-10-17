import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { Colors } from '@/constants/theme';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/schema';
import { seedDevAccounts } from '@/db/seed';
import { AuthProvider } from '@/lib/auth';

async function initDatabase(db: SQLiteDatabase) {
  await migrateDbIfNeeded(db);
  await seedDevAccounts(db);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  if (!fontsLoaded) return null;

  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDatabase}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
          <Stack.Screen name="index" options={{ animation: 'none' }} />
          <Stack.Screen name="onboarding" options={{ animation: 'none' }} />
          <Stack.Screen name="auth" options={{ animation: 'none' }} />
          <Stack.Screen name="(app)" options={{ animation: 'none' }} />
        </Stack>
      </AuthProvider>
    </SQLiteProvider>
  );
}
