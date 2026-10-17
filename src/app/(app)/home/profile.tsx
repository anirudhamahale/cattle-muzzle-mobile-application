import { LogOut, ScanFace, ShieldCheck, Stethoscope, Tractor, Warehouse } from 'lucide-react-native';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Badge, Card, KeyValue, Screen, Section } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth, useCurrentUser } from '@/lib/auth';
import { MATCH_THRESHOLD, muzzleEngine } from '@/lib/muzzle';

export default function Profile() {
  const user = useCurrentUser();
  const { logOut } = useAuth();
  const isDoctor = user.role === 'doctor';
  const RoleIcon = isDoctor ? Stethoscope : user.owner_type === 'gaushala' ? Warehouse : Tractor;
  const roleLabel = isDoctor ? 'Veterinary doctor' : user.owner_type === 'gaushala' ? 'Gaushala' : 'Independent farmer';

  function confirmSignOut() {
    Alert.alert('Sign out?', 'Your data stays on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logOut },
    ]);
  }

  return (
    <Screen>
      <Card style={styles.hero}>
        <View style={[styles.avatar, { backgroundColor: isDoctor ? Colors.accentSoft : Colors.primarySoft }]}>
          <RoleIcon size={32} color={isDoctor ? Colors.accent : Colors.primary} />
        </View>
        <Text variant="title" style={styles.center}>{isDoctor ? `Dr. ${user.name}` : user.name}</Text>
        <Badge label={roleLabel} tone={isDoctor ? 'gold' : 'green'} />
      </Card>

      <Section title="Account" icon={ShieldCheck}>
        <View style={styles.grid}>
          <KeyValue label="Mobile" value={user.phone} />
          {user.org_name && <KeyValue label={isDoctor ? 'Hospital / clinic' : 'Gaushala'} value={user.org_name} />}
          {user.registration_no && <KeyValue label="Registration no." value={user.registration_no} />}
          <KeyValue label="Location" value={[user.village, user.district, user.state].filter(Boolean).join(', ') || '—'} />
          <KeyValue label="Member since" value={new Date(user.created_at).toLocaleDateString()} />
        </View>
      </Section>

      <Section title="Muzzle recognition" icon={ScanFace}>
        <View style={styles.grid}>
          <KeyValue label="Engine" value={muzzleEngine.label} />
          <KeyValue label="Match threshold" value={`${Math.round(MATCH_THRESHOLD * 100)}% similarity`} />
        </View>
        <Text variant="caption" color={Colors.mutedForeground}>
          {muzzleEngine.isDemo
            ? 'Running in demo mode. Configure EXPO_PUBLIC_MUZZLE_API_URL to use a trained muzzle model for detection and duplicate checks.'
            : 'Muzzle photos are sent to the configured model server for detection and identity matching.'}
        </Text>
      </Section>

      <Button title="Sign out" icon={LogOut} variant="danger" onPress={confirmSignOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  hero: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  avatar: { width: 72, height: 72, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.md, columnGap: Spacing.lg },
});
