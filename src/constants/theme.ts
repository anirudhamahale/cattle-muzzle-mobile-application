/**
 * Design tokens.
 *
 * Palette: UI UX Pro Max (uupm.cc) "Agriculture/Farm Tech" system — earth green + harvest gold.
 * Style:   "Organic Biophilic" (rounded 16–24px, soft natural shadows) combined with
 *          "Accessible & Ethical" (4.5:1+ contrast, 16px+ body text, 44px touch targets).
 *
 * The app is locked to light mode: it is used outdoors in sheds and fields, where a
 * high-contrast light UI reads best in sunlight.
 */
import { Platform } from 'react-native';

export const Colors = {
  primary: '#15803D',
  onPrimary: '#FFFFFF',
  primaryPressed: '#166534',
  secondary: '#22C55E',
  primarySoft: '#DCFCE7',
  accent: '#A16207', // harvest gold, used for the doctor role and highlights
  accentSoft: '#FEF3C7',
  onAccent: '#FFFFFF',
  background: '#F0FDF4',
  foreground: '#14532D',
  card: '#FFFFFF',
  muted: '#E8F0F1',
  mutedForeground: '#475569',
  border: '#BBF7D0',
  borderStrong: '#86EFAC',
  destructive: '#DC2626',
  destructiveSoft: '#FEE2E2',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  success: '#15803D',
  info: '#0369A1',
  infoSoft: '#E0F2FE',
  overlay: 'rgba(5, 46, 22, 0.55)',
  black: '#000000',
  white: '#FFFFFF',
} as const;

export const Fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const Type = {
  display: { fontFamily: Fonts.extrabold, fontSize: 28, lineHeight: 34 },
  title: { fontFamily: Fonts.bold, fontSize: 22, lineHeight: 28 },
  heading: { fontFamily: Fonts.bold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: Fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: Fonts.semibold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: Fonts.medium, fontSize: 13, lineHeight: 18 },
} as const;

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const Radius = { sm: 10, md: 16, lg: 20, xl: 24, pill: 999 } as const;

/** Minimum touch target (Accessible & Ethical style). */
export const TouchTarget = 48;

export const Shadow = Platform.select({
  ios: {
    shadowColor: '#14532D',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  default: { elevation: 2 },
});
