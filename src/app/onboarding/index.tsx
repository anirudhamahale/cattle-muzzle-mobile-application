import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Camera,
  Film,
  HeartPulse,
  Images,
  Milk,
  ScanFace,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Syringe,
  Tractor,
  Warehouse,
  type LucideIcon,
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

type Slide = {
  key: string;
  icon: LucideIcon;
  satellites: LucideIcon[];
  tint: string;
  soft: string;
  eyebrow: string;
  title: string;
  description: string;
};

const SLIDES: Slide[] = [
  {
    key: 'welcome',
    icon: ScanFace,
    satellites: [Sparkles, ShieldCheck, BadgeCheck],
    tint: Colors.primary,
    soft: Colors.primarySoft,
    eyebrow: 'WELCOME',
    title: 'Every muzzle is unique',
    description:
      'The ridges and beads on a cow’s nose are as unique as a human fingerprint. Pashu Muzzle ID uses them to identify each animal — no tags that fall off or get swapped.',
  },
  {
    key: 'register',
    icon: Camera,
    satellites: [Film, Images, ScanFace],
    tint: Colors.primary,
    soft: Colors.primarySoft,
    eyebrow: 'REGISTER',
    title: 'Add a cow in a minute',
    description:
      'Photograph the muzzle with the on-screen guide, record a short video, or pick photos from your gallery. The app checks each shot and keeps the clearest ones.',
  },
  {
    key: 'scan',
    icon: ScanSearch,
    satellites: [ScanFace, BadgeCheck, Sparkles],
    tint: Colors.info,
    soft: Colors.infoSoft,
    eyebrow: 'SCAN',
    title: 'Scan to see details',
    description:
      'Point the camera at any registered animal’s muzzle to pull up its profile — breed, age, owner and health history — and catch duplicate registrations.',
  },
  {
    key: 'users',
    icon: Warehouse,
    satellites: [Tractor, Milk, HeartPulse],
    tint: Colors.primary,
    soft: Colors.primarySoft,
    eyebrow: 'FOR GAUSHALAS & FARMERS',
    title: 'Your herd, organised',
    description:
      'Keep every animal’s breed, age, use, milk yield and pregnancy status in one place. You see only your own cattle.',
  },
  {
    key: 'doctors',
    icon: Stethoscope,
    satellites: [Syringe, BellRing, BadgeCheck],
    tint: Colors.accent,
    soft: Colors.accentSoft,
    eyebrow: 'FOR VETERINARY DOCTORS',
    title: 'Care across every herd',
    description:
      'Doctors see all registered cattle, verify identities, record vaccinations and treatments, and get reminders when follow-ups are due.',
  },
];

export default function Onboarding() {
  const { completeOnboarding } = useAuth();
  const { width } = useWindowDimensions();
  const listRef = useRef<Animated.FlatList<Slide>>(null);
  const scrollX = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  function next() {
    if (isLast) completeOnboarding();
    else listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Text variant="label" color={Colors.mutedForeground}>
          {index + 1} / {SLIDES.length}
        </Text>
        {!isLast && (
          <Pressable onPress={completeOnboarding} hitSlop={12} accessibilityRole="button" accessibilityLabel="Skip introduction">
            <Text variant="bodyStrong" color={Colors.primary}>Skip</Text>
          </Pressable>
        )}
      </View>

      <Animated.FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item, index: i }) => <SlideView slide={item} width={width} index={i} scrollX={scrollX} />}
      />

      <View style={styles.bottom}>
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {SLIDES.map((s, i) => (
            <Dot key={s.key} index={i} width={width} scrollX={scrollX} />
          ))}
        </View>
        <Button
          title={isLast ? 'Get started' : 'Next'}
          icon={isLast ? undefined : ArrowRight}
          size="lg"
          onPress={next}
          accessibilityHint={isLast ? 'Go to login' : 'Show the next introduction page'}
        />
      </View>
    </SafeAreaView>
  );
}

function SlideView({ slide, width, index, scrollX }: { slide: Slide; width: number; index: number; scrollX: SharedValue<number> }) {
  const Icon = slide.icon;
  const range = [(index - 1) * width, index * width, (index + 1) * width];
  const art = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, range, [0.3, 1, 0.3], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(scrollX.value, range, [0.8, 1, 0.8], Extrapolation.CLAMP) }],
  }));
  const orbit = Math.min(width * 0.62, 280);

  return (
    <View style={[styles.slide, { width }]}>
      <Animated.View
        style={[styles.art, { width: orbit, height: orbit }, art]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <View style={[styles.ring, { width: orbit, height: orbit, borderRadius: orbit / 2, backgroundColor: slide.soft }]} />
        <View
          style={[
            styles.ring,
            { width: orbit * 0.7, height: orbit * 0.7, borderRadius: orbit * 0.35, borderColor: slide.tint, borderWidth: 2, borderStyle: 'dashed', opacity: 0.35 },
          ]}
        />
        <View style={[styles.core, { backgroundColor: slide.tint }]}>
          <Icon size={56} color={Colors.white} strokeWidth={1.8} />
        </View>
        {slide.satellites.map((Sat, i) => {
          const angle = (-90 + i * 120) * (Math.PI / 180);
          const r = orbit * 0.42;
          return (
            <View
              key={i}
              style={[
                styles.satellite,
                { left: orbit / 2 + r * Math.cos(angle) - 24, top: orbit / 2 + r * Math.sin(angle) - 24 },
              ]}>
              <Sat size={22} color={slide.tint} />
            </View>
          );
        })}
      </Animated.View>

      <View style={styles.copy}>
        <Text variant="label" color={slide.tint} style={styles.eyebrow}>{slide.eyebrow}</Text>
        <Text variant="display" style={styles.center} accessibilityRole="header">{slide.title}</Text>
        <Text color={Colors.mutedForeground} style={styles.center}>{slide.description}</Text>
      </View>
    </View>
  );
}

function Dot({ index, width, scrollX }: { index: number; width: number; scrollX: SharedValue<number> }) {
  const range = [(index - 1) * width, index * width, (index + 1) * width];
  const style = useAnimatedStyle(() => ({
    width: interpolate(scrollX.value, range, [8, 28, 8], Extrapolation.CLAMP),
    opacity: interpolate(scrollX.value, range, [0.35, 1, 0.35], Extrapolation.CLAMP),
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.xxl },
  art: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
  core: { width: 112, height: 112, borderRadius: Radius.xl + 8, alignItems: 'center', justifyContent: 'center' },
  satellite: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  copy: { gap: Spacing.md, alignItems: 'center' },
  eyebrow: { letterSpacing: 1.2 },
  center: { textAlign: 'center' },
  bottom: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, gap: Spacing.xl },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4, backgroundColor: Colors.primary },
});
