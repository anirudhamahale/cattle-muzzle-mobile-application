import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';

import { Text } from './text';

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, contentStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Section({ title, icon: Icon, action, children }: {
  title: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        {Icon && (
          <View style={styles.sectionIcon}>
            <Icon size={18} color={Colors.primary} strokeWidth={2.2} />
          </View>
        )}
        <Text variant="heading" style={styles.flex} accessibilityRole="header">
          {title}
        </Text>
        {action}
      </View>
      {children}
    </Card>
  );
}

export function Badge({ label, tone = 'green', icon: Icon }: {
  label: string;
  tone?: 'green' | 'gold' | 'red' | 'blue' | 'grey';
  icon?: LucideIcon;
}) {
  const t = {
    green: [Colors.primarySoft, Colors.primaryPressed],
    gold: [Colors.accentSoft, '#854D0E'],
    red: [Colors.destructiveSoft, '#B91C1C'],
    blue: [Colors.infoSoft, Colors.info],
    grey: [Colors.muted, Colors.mutedForeground],
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t[0] }]}>
      {Icon && <Icon size={13} color={t[1]} strokeWidth={2.5} />}
      <Text variant="caption" color={t[1]}>{label}</Text>
    </View>
  );
}

export function Banner({ icon: Icon, title, message, tone = 'gold' }: {
  icon: LucideIcon;
  title: string;
  message: string;
  tone?: 'gold' | 'blue' | 'red';
}) {
  const [bg, fg] = {
    gold: [Colors.warningSoft, Colors.warning],
    blue: [Colors.infoSoft, Colors.info],
    red: [Colors.destructiveSoft, Colors.destructive],
  }[tone];
  return (
    <View style={[styles.banner, { backgroundColor: bg }]} accessibilityRole="alert">
      <Icon size={20} color={fg} />
      <View style={styles.flex}>
        <Text variant="label" color={fg}>{title}</Text>
        <Text variant="caption" color={Colors.foreground}>{message}</Text>
      </View>
    </View>
  );
}

export function EmptyState({ icon: Icon, title, message, action }: {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon size={36} color={Colors.primary} />
      </View>
      <Text variant="heading" style={styles.center}>{title}</Text>
      <Text color={Colors.mutedForeground} style={styles.center}>{message}</Text>
      {action}
    </View>
  );
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View style={styles.kv}>
      <Text variant="caption" color={Colors.mutedForeground}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text variant="bodyStrong">{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow,
  },
  section: { gap: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  banner: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.md },
  empty: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.xl },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kv: { flexBasis: '45%', flexGrow: 1, gap: 2 },
});
