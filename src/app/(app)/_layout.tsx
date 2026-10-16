import { Stack } from 'expo-router';

import { Colors, Fonts } from '@/constants/theme';

export default function AppLayout() {
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
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="cattle/[id]" options={{ title: 'Cattle profile' }} />
      <Stack.Screen
        name="capture"
        options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="health-record" options={{ title: 'Add health record', presentation: 'modal' }} />
    </Stack>
  );
}
