import { Stack } from 'expo-router';

import { Colors, Fonts } from '@/constants/theme';

export default function AuthLayout() {
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
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: '' }} />
      <Stack.Screen name="register" options={{ title: 'Create account' }} />
    </Stack>
  );
}
