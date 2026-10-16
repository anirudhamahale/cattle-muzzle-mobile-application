import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';

import { Text } from './ui/text';

export function RoleCard({
  icon: Icon,
  title,
  subtitle,
  tint,
  tintSoft,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  tint: string;
  tintSoft: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      style={({ pressed }) => [styles.card, pressed && { borderColor: tint, backgroundColor: tintSoft }]}>
      <View style={[styles.icon, { backgroundColor: tintSoft }]}>
        <Icon size={28} color={tint} strokeWidth={2} />
      </View>
      <View style={styles.body}>
        <Text variant="heading">{title}</Text>
        <Text variant="caption" color={Colors.mutedForeground}>{subtitle}</Text>
      </View>
      <ChevronRight size={22} color={Colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadow,
  },
  icon: { width: 56, height: 56, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
});
