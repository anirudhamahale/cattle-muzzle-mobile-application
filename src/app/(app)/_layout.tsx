import { Redirect, Stack } from 'expo-router';

import { Colors, Fonts } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function AppLayout() {
  const { isReady, isLoggedIn } = useAuth();

  if (!isReady) return null;
  if (!isLoggedIn) return <Redirect href="/auth/login" />;

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.foreground,
        headerTitleStyle: { fontFamily: Fonts.bold },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: Colors.background },
      }}>
      <Stack.Screen name="home" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="cattle/[id]" options={{ title: 'Cattle profile' }} />
      <Stack.Screen
        name="capture"
        options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="health-record" options={{ title: 'Add health record', presentation: 'modal' }} />
    </Stack>
  );
}
