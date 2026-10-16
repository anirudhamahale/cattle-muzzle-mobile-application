import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radius, Spacing, TouchTarget } from '@/constants/theme';

import { Text } from './text';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';

const palette: Record<Variant, { bg: string; fg: string; border: string; pressed: string }> = {
  primary: { bg: Colors.primary, fg: Colors.onPrimary, border: Colors.primary, pressed: Colors.primaryPressed },
  accent: { bg: Colors.accent, fg: Colors.onAccent, border: Colors.accent, pressed: '#854D0E' },
  secondary: { bg: Colors.primarySoft, fg: Colors.primaryPressed, border: Colors.primarySoft, pressed: Colors.border },
  outline: { bg: Colors.card, fg: Colors.foreground, border: Colors.borderStrong, pressed: Colors.primarySoft },
  ghost: { bg: 'transparent', fg: Colors.primary, border: 'transparent', pressed: Colors.primarySoft },
  danger: { bg: Colors.destructiveSoft, fg: Colors.destructive, border: Colors.destructiveSoft, pressed: '#FECACA' },
};

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon: Icon,
  loading,
  disabled,
  size = 'md',
  style,
  accessibilityHint,
}: Props) {
  const p = palette[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      android_ripple={{ color: p.pressed }}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' && styles.lg,
        { backgroundColor: pressed ? p.pressed : p.bg, borderColor: p.border },
        inactive && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {Icon && <Icon size={20} color={p.fg} strokeWidth={2.2} />}
          <Text variant="bodyStrong" color={p.fg}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** Round icon-only button, e.g. camera controls. */
export function IconButton({
  icon: Icon,
  label,
  onPress,
  color = Colors.foreground,
  background = Colors.card,
  size = TouchTarget,
  style,
}: {
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
  color?: string;
  background?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        styles.icon,
        { width: size, height: size, backgroundColor: background, opacity: pressed ? 0.7 : 1 },
        style,
      ]}>
      <Icon size={size * 0.46} color={color} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lg: { minHeight: 56, borderRadius: Radius.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  disabled: { opacity: 0.5 },
  icon: { borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
