import { router } from 'expo-router';
import { ScanFace, Stethoscope, Tractor } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { RoleCard } from '@/components/role-card';
import { Screen } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

export default function Welcome() {
  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <ScanFace size={44} color={Colors.onPrimary} strokeWidth={1.8} />
        </View>
        <Text variant="display" style={styles.center}>Pashu Muzzle ID</Text>
        <Text color={Colors.mutedForeground} style={styles.center}>
          Register and identify cattle by their muzzle print — as unique as a fingerprint.
        </Text>
      </View>

      <Text variant="label" color={Colors.mutedForeground} style={styles.prompt}>
        HOW WILL YOU USE THE APP?
      </Text>

      <RoleCard
        icon={Tractor}
        title="Cattle owner"
        subtitle="Gaushala or independent farmer — register and track your herd"
        tint={Colors.primary}
        tintSoft={Colors.primarySoft}
        onPress={() => router.push({ pathname: '/login', params: { role: 'owner' } })}
      />
      <RoleCard
        icon={Stethoscope}
        title="Veterinary doctor"
        subtitle="View all cattle, verify identities and add health records"
        tint={Colors.accent}
        tintSoft={Colors.accentSoft}
        onPress={() => router.push({ pathname: '/login', params: { role: 'doctor' } })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center' },
  hero: { alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xl },
  logo: {
    width: 88,
    height: 88,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  center: { textAlign: 'center' },
  prompt: { letterSpacing: 1 },
});
