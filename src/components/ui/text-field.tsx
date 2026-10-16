import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Colors, Fonts, Radius, Spacing, TouchTarget } from '@/constants/theme';

import { Text } from './text';

type Props = TextInputProps & {
  label: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  suffix?: string;
};

export function TextField({ label, error, hint, required, suffix, secureTextEntry, multiline, style, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const borderColor = error ? Colors.destructive : focused ? Colors.primary : Colors.borderStrong;

  return (
    <View style={styles.wrap}>
      <Text variant="label">
        {label}
        {required && <Text variant="label" color={Colors.destructive}> *</Text>}
      </Text>
      <View style={[styles.field, multiline && styles.multiline, { borderColor }, focused && styles.focused]}>
        <TextInput
          {...props}
          multiline={multiline}
          secureTextEntry={secureTextEntry && hidden}
          accessibilityLabel={label}
          placeholderTextColor={Colors.mutedForeground}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[styles.input, multiline && styles.inputMultiline, style]}
        />
        {suffix && <Text variant="label" color={Colors.mutedForeground}>{suffix}</Text>}
        {secureTextEntry && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            {hidden ? <Eye size={20} color={Colors.mutedForeground} /> : <EyeOff size={20} color={Colors.mutedForeground} />}
          </Pressable>
        )}
      </View>
      {error ? (
        <Text variant="caption" color={Colors.destructive} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color={Colors.mutedForeground}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  field: {
    minHeight: TouchTarget + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderRadius: Radius.md,
  },
  focused: { borderWidth: 2 },
  multiline: { alignItems: 'flex-start', paddingVertical: Spacing.md },
  input: { flex: 1, fontFamily: Fonts.regular, fontSize: 16, color: Colors.foreground, paddingVertical: Spacing.md },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top', paddingVertical: 0 },
});
