import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import {
  BadgeCheck,
  Beef,
  CalendarClock,
  FlaskConical,
  HeartPulse,
  Mars,
  Milk,
  ScanFace,
  Users,
  Venus,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { cattleTitle } from '@/components/cattle-card';
import { Button } from '@/components/ui/button';
import { Badge, Banner, Card, Screen, Section } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { getStats } from '@/db/cattle';
import { useCurrentUser } from '@/lib/auth';
import { muzzleEngine } from '@/lib/muzzle';

type Stats = Awaited<ReturnType<typeof getStats>>;

function StatTile({ icon: Icon, label, value, tint = Colors.primary }: {
  icon: LucideIcon;
  label: string;
  value: number;
  tint?: string;
}) {
  return (
    <Card style={styles.tile}>
      <Icon size={20} color={tint} />
      <Text variant="title">{value}</Text>
      <Text variant="caption" color={Colors.mutedForeground}>{label}</Text>
    </Card>
  );
}

export default function Home() {
  const db = useSQLiteContext();
  const user = useCurrentUser();
  const [stats, setStats] = useState<Stats | null>(null);
  const isDoctor = user.role === 'doctor';

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getStats(db, user).then((s) => active && setStats(s));
      return () => {
        active = false;
      };
    }, [db, user]),
  );

  const roleLabel = isDoctor ? 'Veterinary doctor' : user.owner_type === 'gaushala' ? 'Gaushala' : 'Independent farmer';

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="caption" color={Colors.mutedForeground}>Namaste,</Text>
          <Text variant="title" numberOfLines={1}>{isDoctor ? `Dr. ${user.name}` : user.name}</Text>
          {user.org_name && <Text variant="caption" color={Colors.mutedForeground}>{user.org_name}</Text>}
        </View>
        <Badge label={roleLabel} tone={isDoctor ? 'gold' : 'green'} />
      </View>

      {muzzleEngine.isDemo && (
        <Banner
          icon={FlaskConical}
          title="Demo muzzle detector"
          message="No muzzle model server is configured, so detection is simulated and duplicate checks are off. Set EXPO_PUBLIC_MUZZLE_API_URL to connect a real model."
        />
      )}

      <Pressable
        onPress={() => router.navigate('/add')}
        accessibilityRole="button"
        accessibilityLabel="Register cattle with a muzzle scan"
        style={({ pressed }) => [styles.hero, pressed && { backgroundColor: Colors.primaryPressed }]}>
        <View style={styles.heroIcon}>
          <ScanFace size={32} color={Colors.primary} />
        </View>
        <View style={styles.flex}>
          <Text variant="heading" color={Colors.onPrimary}>Register cattle</Text>
          <Text variant="caption" color={Colors.primarySoft}>
            Scan the muzzle with the camera, a short video or gallery photos
          </Text>
        </View>
      </Pressable>

      <Text variant="heading" accessibilityRole="header">
        {isDoctor ? 'All registered cattle' : 'Your herd'}
      </Text>
      <View style={styles.grid}>
        <StatTile icon={Beef} label="Total cattle" value={stats?.total ?? 0} />
        <StatTile icon={Venus} label="Female" value={stats?.female ?? 0} />
        <StatTile icon={Mars} label="Male" value={stats?.male ?? 0} />
        <StatTile icon={Milk} label="In milk" value={stats?.inMilk ?? 0} />
        <StatTile icon={HeartPulse} label="Need attention" value={stats?.attention ?? 0} tint={Colors.destructive} />
        {isDoctor ? (
          <StatTile icon={Users} label="Owners" value={stats?.owners ?? 0} tint={Colors.accent} />
        ) : (
          <StatTile icon={BadgeCheck} label="Vet verified" value={stats?.verified ?? 0} tint={Colors.info} />
        )}
      </View>

      <Section title="Due this week" icon={CalendarClock}>
        {stats && stats.due.length > 0 ? (
          stats.due.map((d) => (
            <Pressable
              key={d.id}
              onPress={() => router.push({ pathname: '/cattle/[id]', params: { id: d.cattle_id } })}
              accessibilityRole="button"
              style={styles.dueRow}>
              <View style={styles.flex}>
                <Text variant="bodyStrong" numberOfLines={1}>{d.title}</Text>
                <Text variant="caption" color={Colors.mutedForeground}>
                  {cattleTitle({ name: d.cattle_name, tag_number: d.tag_number, breed: 'cattle' })}
                </Text>
              </View>
              <Badge label={d.overdue ? `Overdue ${d.next_due}` : d.next_due ?? ''} tone={d.overdue ? 'red' : 'gold'} />
            </Pressable>
          ))
        ) : (
          <Text color={Colors.mutedForeground}>No vaccinations or follow-ups due in the next 7 days.</Text>
        )}
      </Section>

      {stats?.total === 0 && (
        <Button title="Register your first cattle" icon={ScanFace} variant="secondary" onPress={() => router.navigate('/add')} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  tile: { flexBasis: '30%', flexGrow: 1, gap: 4, padding: Spacing.md },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 48 },
});
