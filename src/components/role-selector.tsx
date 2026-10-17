import { CircleCheck, Stethoscope, Tractor, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import type { Role } from '@/db/types';

import { Text } from './ui/text';

/** User-facing names: "User" covers gaushalas and independent farmers. */
export const ROLE_COPY: Record<Role, { title: string; subtitle: string; icon: LucideIcon; tint: string; soft: string }> = {
  doctor: {
    title: 'Doctor',
    subtitle: 'Veterinary doctor',
    icon: Stethoscope,
    tint: Colors.accent,
    soft: Colors.accentSoft,
  },
  owner: {
    title: 'User',
    subtitle: 'Gaushala or farmer',
    icon: Tractor,
    tint: Colors.primary,
    soft: Colors.primarySoft,
  },
};

const ORDER: Role[] = ['owner', 'doctor'];

/** Two large tiles for choosing which kind of account to log in / sign up as. */
export function RoleSelector({ value, onChange, label }: { value: Role; onChange: (r: Role) => void; label: string }) {
  return (
    <View style={styles.wrap}>
      <Text variant="label" color={Colors.mutedForeground}>{label}</Text>
      <View style={styles.row} accessibilityRole="radiogroup">
        {ORDER.map((role) => {
          const c = ROLE_COPY[role];
          const selected = value === role;
          const Icon = c.icon;
          return (
            <Pressable
              key={role}
              onPress={() => onChange(role)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${c.title}, ${c.subtitle}`}
              style={[styles.tile, selected && { borderColor: c.tint, backgroundColor: c.soft }]}>
              {selected && (
                <View style={styles.check}>
                  <CircleCheck size={20} color={c.tint} />
                </View>
              )}
              <View style={[styles.icon, { backgroundColor: selected ? Colors.card : c.soft }]}>
                <Icon size={28} color={c.tint} />
              </View>
              <Text variant="heading">{c.title}</Text>
              <Text variant="caption" color={Colors.mutedForeground} style={styles.center}>{c.subtitle}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.md },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  check: { position: 'absolute', top: Spacing.sm, right: Spacing.sm },
  icon: { width: 56, height: 56, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  center: { textAlign: 'center' },
});
