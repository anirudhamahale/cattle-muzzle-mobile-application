import { Image } from 'expo-image';
import { router } from 'expo-router';
import { BadgeCheck, ChevronRight, ScanFace } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatAge, HEALTH_STATUSES, label } from '@/constants/cattle';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import type { Cattle } from '@/db/types';

import { Badge } from './ui/layout';
import { Text } from './ui/text';

export const healthTone = (s: Cattle['health_status']) =>
  s === 'healthy' ? 'green' : s === 'sick' ? 'red' : 'gold';

export const cattleTitle = (c: Pick<Cattle, 'name' | 'tag_number' | 'breed'>) =>
  c.name || (c.tag_number ? `Tag ${c.tag_number}` : `Unnamed ${c.breed}`);

function CattleCardInner({ cattle, showOwner }: { cattle: Cattle; showOwner: boolean }) {
  const photo = cattle.body_photo ?? cattle.muzzle_photos[0]?.uri;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/cattle/[id]', params: { id: cattle.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${cattleTitle(cattle)}, ${cattle.breed}, ${cattle.sex}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.thumbWrap}>
        {photo ? (
          <Image source={photo} style={styles.thumb} contentFit="cover" transition={150} />
        ) : (
          <ScanFace size={28} color={Colors.primary} />
        )}
      </View>
      <View style={styles.body}>
        <Text variant="bodyStrong" numberOfLines={1}>{cattleTitle(cattle)}</Text>
        <Text variant="caption" color={Colors.mutedForeground} numberOfLines={1}>
          {cattle.breed} · {cattle.sex === 'female' ? 'Female' : 'Male'} · {formatAge(cattle.age_months)}
        </Text>
        {showOwner && cattle.owner_name && (
          <Text variant="caption" color={Colors.mutedForeground} numberOfLines={1}>
            Owner: {cattle.owner_name}
          </Text>
        )}
        <View style={styles.badges}>
          <Badge label={label(HEALTH_STATUSES, cattle.health_status)} tone={healthTone(cattle.health_status)} />
          {cattle.verified_by && <Badge label="Vet verified" tone="blue" icon={BadgeCheck} />}
        </View>
      </View>
      <ChevronRight size={20} color={Colors.mutedForeground} />
    </Pressable>
  );
}

export const CattleCard = memo(CattleCardInner);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow,
  },
  pressed: { backgroundColor: Colors.primarySoft },
  thumbWrap: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumb: { width: 72, height: 72 },
  body: { flex: 1, gap: 3 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
});
