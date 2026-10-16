import { Image } from 'expo-image';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  BadgeCheck,
  ClipboardList,
  Film,
  HeartPulse,
  Info,
  MapPin,
  Plus,
  ScanFace,
  ShieldCheck,
  Trash,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { cattleTitle, healthTone } from '@/components/cattle-card';
import { Button } from '@/components/ui/button';
import { Badge, Card, EmptyState, KeyValue, Screen, Section } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import {
  ageCategory,
  BREED_TYPES,
  formatAge,
  HEALTH_RECORD_TYPES,
  HEALTH_STATUSES,
  label,
  SPECIES,
  usageLabel,
} from '@/constants/cattle';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { deleteCattle, getCattle, listHealthRecords, setVerified } from '@/db/cattle';
import type { Cattle, HealthRecord } from '@/db/types';
import { useCurrentUser } from '@/lib/auth';

export default function CattleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const user = useCurrentUser();
  const { width } = useWindowDimensions();
  const [cattle, setCattle] = useState<Cattle | null | undefined>(undefined);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const isDoctor = user.role === 'doctor';

  const load = useCallback(async () => {
    const c = await getCattle(db, id);
    // Owners may only open their own animals.
    setCattle(c && (isDoctor || c.owner_id === user.id) ? c : null);
    setRecords(await listHealthRecords(db, id));
  }, [db, id, isDoctor, user.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (cattle === undefined) return <View style={styles.flex} />;
  if (cattle === null) {
    return (
      <Screen edges={[]}>
        <EmptyState icon={ScanFace} title="Not found" message="This animal doesn't exist or isn't in your herd." />
      </Screen>
    );
  }

  const canDelete = cattle.created_by === user.id || cattle.owner_id === user.id;
  const photoWidth = width - Spacing.lg * 2;

  async function toggleVerified() {
    await setVerified(db, cattle!.id, cattle!.verified_by ? null : user.id);
    load();
  }

  function remove() {
    Alert.alert('Delete this animal?', 'Its muzzle photos and health records will be removed from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCattle(db, cattle!.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: cattleTitle(cattle) }} />

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={[styles.gallery, { width: photoWidth }]}
        accessibilityLabel="Muzzle photos">
        {[...(cattle.body_photo ? [{ uri: cattle.body_photo, label: 'Side profile' }] : []),
          ...cattle.muzzle_photos.map((s, i) => ({ uri: s.uri, label: `Muzzle ${i + 1} · ${Math.round(s.detection.confidence * 100)}%` }))].map((p) => (
          <View key={p.uri} style={{ width: photoWidth }}>
            <Image source={p.uri} style={styles.photo} contentFit="cover" accessibilityLabel={p.label} />
            <View style={styles.photoLabel}>
              <Text variant="caption" color={Colors.white}>{p.label}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.titleBlock}>
        <Text variant="title">{cattleTitle(cattle)}</Text>
        {cattle.tag_number && <Text color={Colors.mutedForeground}>Ear tag {cattle.tag_number}</Text>}
        <View style={styles.badges}>
          <Badge label={label(HEALTH_STATUSES, cattle.health_status)} tone={healthTone(cattle.health_status)} />
          {cattle.verified_by ? (
            <Badge label={`Verified by Dr. ${cattle.verified_by_name ?? ''}`} tone="blue" icon={BadgeCheck} />
          ) : (
            <Badge label="Not vet-verified" tone="grey" />
          )}
          {cattle.is_pregnant && <Badge label="Pregnant" tone="gold" />}
        </View>
      </View>

      {isDoctor && (
        <View style={styles.actions}>
          <Button
            title="Health record"
            icon={Plus}
            variant="accent"
            style={styles.flex}
            onPress={() => router.push({ pathname: '/health-record', params: { cattleId: cattle.id } })}
          />
          <Button
            title={cattle.verified_by ? 'Unverify' : 'Verify identity'}
            icon={ShieldCheck}
            variant={cattle.verified_by ? 'outline' : 'primary'}
            style={styles.flex}
            onPress={toggleVerified}
          />
        </View>
      )}

      <Section title="Details" icon={Info}>
        <View style={styles.grid}>
          <KeyValue label="Species" value={label(SPECIES, cattle.species)} />
          <KeyValue label="Breed" value={`${cattle.breed} (${label(BREED_TYPES, cattle.breed_type)})`} />
          <KeyValue label="Sex" value={cattle.sex === 'female' ? 'Female' : 'Male'} />
          <KeyValue label="Age" value={formatAge(cattle.age_months)} />
          <KeyValue label="Census age band" value={ageCategory(cattle.species, cattle.breed_type, cattle.sex, cattle.age_months)} />
          <KeyValue label="Use" value={usageLabel(cattle.use_status)} />
          {cattle.sex === 'female' && <KeyValue label="Calvings" value={cattle.lactation_no ?? '—'} />}
          {cattle.milk_yield_lpd != null && <KeyValue label="Milk yield" value={`${cattle.milk_yield_lpd} L/day`} />}
          {cattle.weight_kg != null && <KeyValue label="Weight" value={`${cattle.weight_kg} kg`} />}
          {cattle.color_marks && <KeyValue label="Colour & marks" value={cattle.color_marks} />}
          <KeyValue label="Owner" value={cattle.owner_name ?? '—'} />
          <KeyValue label="Registered" value={new Date(cattle.created_at).toLocaleDateString()} />
        </View>
        {cattle.notes && <Text color={Colors.mutedForeground}>{cattle.notes}</Text>}
      </Section>

      <Section title="Muzzle identity" icon={ScanFace}>
        <View style={styles.grid}>
          <KeyValue label="Muzzle shots" value={cattle.muzzle_photos.length} />
          <KeyValue label="Best confidence" value={cattle.muzzle_confidence != null ? `${Math.round(cattle.muzzle_confidence * 100)}%` : '—'} />
          <KeyValue label="Detector" value={cattle.detector === 'demo' ? 'Demo (simulated)' : 'Muzzle model'} />
          <KeyValue label="Identity template" value={cattle.muzzle_embedding ? 'Stored' : 'Not available'} />
        </View>
        {cattle.muzzle_video && <MuzzleVideo uri={cattle.muzzle_video} />}
      </Section>

      {(cattle.village || cattle.district || cattle.latitude != null) && (
        <Section title="Location" icon={MapPin}>
          <Text>{[cattle.village, cattle.district, cattle.state].filter(Boolean).join(', ') || '—'}</Text>
          {cattle.latitude != null && (
            <Text variant="caption" color={Colors.mutedForeground}>
              GPS {cattle.latitude.toFixed(5)}, {cattle.longitude?.toFixed(5)}
            </Text>
          )}
        </Section>
      )}

      <Section title="Health records" icon={HeartPulse}>
        {records.length === 0 ? (
          <Text color={Colors.mutedForeground}>
            {isDoctor ? 'No records yet. Add a check-up, vaccination or treatment.' : 'No records yet. A veterinary doctor can add them.'}
          </Text>
        ) : (
          records.map((r) => <RecordRow key={r.id} record={r} />)
        )}
      </Section>

      {canDelete && <Button title="Delete animal" icon={Trash} variant="danger" onPress={remove} />}
    </Screen>
  );
}

function RecordRow({ record }: { record: HealthRecord }) {
  return (
    <Card style={styles.record}>
      <View style={styles.recordHead}>
        <ClipboardList size={18} color={Colors.accent} />
        <Text variant="bodyStrong" style={styles.flex}>{record.title}</Text>
        <Badge label={label(HEALTH_RECORD_TYPES, record.type)} tone="gold" />
      </View>
      <Text variant="caption" color={Colors.mutedForeground}>
        {record.record_date} · Dr. {record.doctor_name}
        {record.next_due ? ` · Next due ${record.next_due}` : ''}
      </Text>
      {record.notes && <Text>{record.notes}</Text>}
    </Card>
  );
}

function MuzzleVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
  });
  return (
    <View style={styles.videoWrap}>
      <View style={styles.videoLabel}>
        <Film size={16} color={Colors.mutedForeground} />
        <Text variant="caption" color={Colors.mutedForeground}>Muzzle video</Text>
      </View>
      <VideoView player={player} style={styles.video} nativeControls contentFit="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gallery: { borderRadius: Radius.xl, overflow: 'hidden', flexGrow: 0 },
  photo: { width: '100%', aspectRatio: 4 / 3, backgroundColor: Colors.muted },
  photoLabel: {
    position: 'absolute',
    left: Spacing.md,
    bottom: Spacing.md,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  titleBlock: { gap: Spacing.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.xs },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.md, columnGap: Spacing.lg },
  record: { gap: Spacing.xs, padding: Spacing.md, shadowOpacity: 0, elevation: 0 },
  recordHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  videoWrap: { gap: Spacing.sm },
  videoLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  video: { width: '100%', aspectRatio: 16 / 9, borderRadius: Radius.md, backgroundColor: Colors.black },
});
