import { Text as RNText, type TextProps } from 'react-native';

import { Colors, Type } from '@/constants/theme';

type Variant = keyof typeof Type;

export function Text({
  variant = 'body',
  color = Colors.foreground,
  style,
  ...props
}: TextProps & { variant?: Variant; color?: string }) {
  return <RNText {...props} style={[Type[variant], { color }, style]} />;
}
