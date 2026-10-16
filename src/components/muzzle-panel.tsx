import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Camera, CircleAlert, Film, FlaskConical, Images, ScanFace, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { captureStore, useCapture } from '@/lib/capture-store';
import { isUsableShot, muzzleEngine, RECOMMENDED_SHOTS, type MuzzleShot } from '@/lib/muzzle';
import { processPhoto, processVideo } from '@/lib/muzzle/pipeline';

import { Button } from './ui/button';
import { Badge, Banner } from './ui/layout';
import { Text } from './ui/text';

const MAX_GALLERY_ITEMS = 5;

export function MuzzlePanel({ error }: { error?: string | null }) {
  const { shots, videoUri } = useCapture();
  const [busy, setBusy] = useState<string | null>(null);
  const usable = shots.filter(isUsableShot).length;

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos access needed', 'Allow photo library access to choose muzzle photos or videos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_GALLERY_ITEMS,
      quality: 1,
      videoMaxDuration: 30,
    });
    if (result.canceled) return;

    const added: MuzzleShot[] = [];
    let rejected = 0;
    try {
      for (const [i, asset] of result.assets.entries()) {
        setBusy(`Checking ${i + 1} of ${result.assets.length}…`);
        if (asset.type === 'video') {
          const frames = await processVideo(asset.uri);
          if (frames.length === 0) rejected++;
          added.push(...frames);
          if (!videoUri) captureStore.setVideo(asset.uri);
        } else {
          const shot = await processPhoto(asset, 'gallery');
          if (isUsableShot(shot)) added.push(shot);
          else rejected++;
        }
      }
    } catch (e) {
      Alert.alert('Could not process media', (e as Error).message);
    } finally {
      setBusy(null);
    }
    captureStore.addShots(added);
    if (rejected > 0) {
      Alert.alert(
        'Some items were skipped',
        `${rejected} ${rejected === 1 ? 'item' : 'items'} had no clear muzzle. Use close-up, well-lit photos where the nose fills most of the frame.`,
      );
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.progressRow}>
        <View style={styles.flex}>
          <Text variant="bodyStrong">
            {usable} of {RECOMMENDED_SHOTS} recommended shots
          </Text>
          <Text variant="caption" color={Colors.mutedForeground}>
            At least 1 is required. More angles make identification more reliable.
          </Text>
        </View>
        {usable >= RECOMMENDED_SHOTS && <Badge label="Ready" tone="green" />}
      </View>
      <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: RECOMMENDED_SHOTS, now: Math.min(usable, RECOMMENDED_SHOTS) }}>
        <View style={[styles.progressFill, { width: `${Math.min(1, usable / RECOMMENDED_SHOTS) * 100}%` }]} />
      </View>

      {shots.length > 0 ? (
        <View style={styles.grid}>
          {shots.map((s) => (
            <ShotTile key={s.uri} shot={s} />
          ))}
        </View>
      ) : (
        <View style={[styles.placeholder, error && { borderColor: Colors.destructive }]}>
          <ScanFace size={36} color={Colors.primary} strokeWidth={1.6} />
          <Text variant="caption" color={Colors.mutedForeground} style={styles.center}>
            Get close (20–30 cm), in good light. The nostrils and the ridged pattern between them should fill the frame.
          </Text>
        </View>
      )}
      {videoUri && <Badge label="Muzzle video attached" tone="blue" icon={Film} />}

      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator color={Colors.primary} />
          <Text variant="label">{busy}</Text>
        </View>
      ) : (
        <View style={styles.actions}>
          <Button title="Photo" icon={Camera} style={styles.flex} onPress={() => router.push({ pathname: '/capture', params: { mode: 'picture' } })} />
          <Button title="Video" icon={Film} variant="secondary" style={styles.flex} onPress={() => router.push({ pathname: '/capture', params: { mode: 'video' } })} />
          <Button title="Gallery" icon={Images} variant="outline" style={styles.flex} onPress={pickFromGallery} />
        </View>
      )}
      {error && <Text variant="caption" color={Colors.destructive}>{error}</Text>}
      {muzzleEngine.isDemo && (
        <Banner
          icon={FlaskConical}
          title="Demo detector"
          message="Confidence scores are simulated until a muzzle model server is connected."
        />
      )}
    </View>
  );
}

function ShotTile({ shot }: { shot: MuzzleShot }) {
  const pct = Math.round(shot.detection.confidence * 100);
  const warn = shot.detection.issues.length > 0;
  return (
    <View style={styles.tile}>
      <Image source={shot.uri} style={styles.tileImg} contentFit="cover" accessibilityLabel={`Muzzle shot from ${shot.source}`} />
      <View style={[styles.conf, { backgroundColor: warn ? Colors.warning : Colors.primary }]}>
        {warn && <CircleAlert size={11} color={Colors.white} />}
        <Text variant="caption" color={Colors.white}>{pct}%</Text>
      </View>
      <Pressable
        onPress={() => captureStore.removeShot(shot.uri)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Remove this shot"
        style={styles.remove}>
        <X size={14} color={Colors.white} strokeWidth={3} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  wrap: { gap: Spacing.md },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: Colors.muted, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tile: { width: '31.5%', aspectRatio: 1, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: Colors.muted },
  tileImg: { width: '100%', height: '100%' },
  conf: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.background,
  },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  busy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, minHeight: 48 },
});
