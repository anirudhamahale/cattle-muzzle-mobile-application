import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Option } from '@/constants/cattle';
import { Colors, Radius, Spacing } from '@/constants/theme';

import { Text } from './text';

type Props<T extends string> = {
  label?: string;
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  required?: boolean;
  error?: string | null;
  /** Lets the user tap the selected chip again to clear it. */
  allowDeselect?: boolean;
  onClear?: () => void;
};

export function ChipGroup<T extends string>({ label, options, value, onChange, required, error, allowDeselect, onClear }: Props<T>) {
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {label && (
        <Text variant="label">
          {label}
          {required && <Text variant="label" color={Colors.destructive}> *</Text>}
        </Text>
      )}
      <View style={styles.row}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => (selected && allowDeselect ? onClear?.() : onChange(o.value))}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={o.label}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.selected,
                pressed && !selected && { backgroundColor: Colors.primarySoft },
              ]}>
              {selected && <Check size={16} color={Colors.onPrimary} strokeWidth={3} />}
              <Text variant="label" color={selected ? Colors.onPrimary : Colors.foreground}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error && <Text variant="caption" color={Colors.destructive}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.card,
  },
  selected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
});
