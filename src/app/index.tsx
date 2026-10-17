import { Redirect } from 'expo-router';
import { ScanFace } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

/** Entry gate: home when logged in, otherwise onboarding (first launch) or login. */
export default function Index() {
  const { isReady, isLoggedIn, hasSeenOnboarding } = useAuth();

  if (!isReady) {
    return (
      <View style={styles.splash}>
        <View style={styles.logo}>
          <ScanFace size={44} color={Colors.onPrimary} strokeWidth={1.8} />
        </View>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (isLoggedIn) return <Redirect href="/home" />;
  return hasSeenOnboarding ? <Redirect href="/auth/login" /> : <Redirect href="/onboarding" />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xl, backgroundColor: Colors.background },
  logo: {
    width: 88,
    height: 88,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
