import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import {
  BadgeCheck,
  Camera,
  CircleAlert,
  FlaskConical,
  Hash,
  Images,
  Lock,
  Plus,
  RefreshCw,
  ScanSearch,
  Search,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { cattleTitle, healthTone } from '@/components/cattle-card';
import { Button } from '@/components/ui/button';
import { Badge, Banner, Card, KeyValue, Screen, Section } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { EAR_TAG_PATTERN, formatAge, HEALTH_STATUSES, label, usageLabel } from '@/constants/cattle';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { canView, findCattleByTag, findMuzzleMatches, getCattle } from '@/db/cattle';
import type { Cattle } from '@/db/types';
import { useCurrentUser } from '@/lib/auth';
import { captureStore } from '@/lib/capture-store';
import { isUsableShot, muzzleEngine, type MuzzleShot } from '@/lib/muzzle';
import { processPhoto, processVideo } from '@/lib/muzzle/pipeline';

type Result =
  | { kind: 'match'; cattle: Cattle; score: number | null; via: 'muzzle' | 'tag' }
  | { kind: 'other-owner'; via: 'muzzle' | 'tag' }
  | { kind: 'no-match'; shot: MuzzleShot }
  | { kind: 'no-model'; shot: MuzzleShot }
  | { kind: 'tag-not-found'; tag: string };

export default function Scan() {
  const db = useSQLiteContext();
  const user = useCurrentUser();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tag, setTag] = useState('');

  async function showCattle(id: string, ownerId: string, via: 'muzzle' | 'tag', score: number | null) {
    if (!canView(user, ownerId)) {
      setResult({ kind: 'other-owner', via });
      return;
    }
    const cattle = await getCattle(db, id);
    if (cattle) setResult({ kind: 'match', cattle, score, via });
  }

  async function identify(shot: MuzzleShot) {
    setError(null);
    setResult(null);
    setBusy('Reading muzzle print…');
    try {
      const embedding = await muzzleEngine.embed(shot);
      if (!embedding) {
        setResult({ kind: 'no-model', shot });
        return;
      }
      setBusy('Searching registered cattle…');
      const [best] = await findMuzzleMatches(db, embedding, 1);
      if (best) await showCattle(best.id, best.owner_id, 'muzzle', best.score);
      else setResult({ kind: 'no-match', shot });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  // When returning from the camera, pick up the shot it handed back.
  useFocusEffect(
    useCallback(() => {
      const shot = captureStore.takeIdentifyShot();
      if (shot) identify(shot);
      // identify is recreated each render; focus is the only trigger.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos access needed', 'Allow photo library access to scan a saved muzzle photo or video.');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 1 });
    if (r.canceled) return;
    const asset = r.assets[0];
    setError(null);
    setResult(null);
    setBusy('Checking muzzle…');
    try {
      const shot =
        asset.type === 'video' ? (await processVideo(asset.uri))[0] : await processPhoto(asset, 'gallery');
      if (!shot || !isUsableShot(shot)) {
        setBusy(null);
        setError('No clear muzzle found. Use a close-up, well-lit photo where the nose fills the frame.');
        return;
      }
      await identify(shot);
    } catch (e) {
      setBusy(null);
      setError((e as Error).message);
    }
  }

  async function lookUpTag() {
    const t = tag.trim();
    if (!EAR_TAG_PATTERN.test(t)) {
      setError('Ear tag numbers are 12 digits.');
      return;
    }
    setError(null);
    const cattle = await findCattleByTag(db, t);
    if (!cattle) setResult({ kind: 'tag-not-found', tag: t });
    else await showCattle(cattle.id, cattle.owner_id, 'tag', null);
  }

  function registerFromShot(shot: MuzzleShot) {
    captureStore.addShots([shot]);
    setResult(null);
    router.navigate('/home/add');
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">Scan cattle</Text>
        <Text color={Colors.mutedForeground}>
          {user.role === 'doctor'
            ? 'Identify any registered animal from its muzzle.'
            : 'Identify an animal in your herd from its muzzle.'}
        </Text>
      </View>

      <Card style={styles.scanCard}>
        <View style={styles.scanIcon}>
          <ScanSearch size={40} color={Colors.primary} strokeWidth={1.6} />
        </View>
        <Text variant="caption" color={Colors.mutedForeground} style={styles.center}>
          Hold the phone 20–30 cm from the nose, in good light, so the nostrils and the ridged pattern fill the guide.
        </Text>
        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color={Colors.primary} />
            <Text variant="label">{busy}</Text>
          </View>
        ) : (
          <View style={styles.row}>
            <Button
              title="Scan muzzle"
              icon={Camera}
              size="lg"
              style={styles.flex}
              onPress={() => router.push({ pathname: '/capture', params: { mode: 'picture', purpose: 'identify' } })}
            />
            <Button title="Gallery" icon={Images} size="lg" variant="outline" onPress={pickFromGallery} />
          </View>
        )}
      </Card>

      {muzzleEngine.isDemo && (
        <Banner
          icon={FlaskConical}
          title="Demo detector"
          message="Muzzle matching needs the muzzle model server. Until it's connected, look animals up by ear tag below."
        />
      )}

      {error && <Banner tone="red" icon={CircleAlert} title="Couldn't scan" message={error} />}
      {result && <ResultView result={result} onRegister={registerFromShot} onReset={() => setResult(null)} />}

      <Section title="Look up by ear tag" icon={Hash}>
        <TextField
          label="Ear tag number"
          value={tag}
          onChangeText={(t) => setTag(t.replace(/\D/g, ''))}
          keyboardType="number-pad"
          maxLength={12}
          placeholder="12-digit tag"
          onSubmitEditing={lookUpTag}
          returnKeyType="search"
        />
        <Button title="Find" icon={Search} variant="secondary" onPress={lookUpTag} disabled={tag.length !== 12} />
      </Section>
    </Screen>
  );
}

function ResultView({ result, onRegister, onReset }: {
  result: Result;
  onRegister: (shot: MuzzleShot) => void;
  onReset: () => void;
}) {
  if (result.kind === 'match') {
    const c = result.cattle;
    const photo = c.body_photo ?? c.muzzle_photos[0]?.uri;
    return (
      <Card style={styles.result}>
        <View style={styles.resultHead}>
          <Badge
            label={result.via === 'tag' ? 'Found by ear tag' : `Muzzle match · ${Math.round((result.score ?? 0) * 100)}%`}
            tone="green"
            icon={BadgeCheck}
          />
        </View>
        <View style={styles.matchRow}>
          {photo && <Image source={photo} style={styles.matchPhoto} contentFit="cover" accessibilityLabel="Matched animal" />}
          <View style={styles.flex}>
            <Text variant="heading">{cattleTitle(c)}</Text>
            {c.tag_number && <Text variant="caption" color={Colors.mutedForeground}>Ear tag {c.tag_number}</Text>}
            <View style={styles.badges}>
              <Badge label={label(HEALTH_STATUSES, c.health_status)} tone={healthTone(c.health_status)} />
              {c.verified_by && <Badge label="Vet verified" tone="blue" />}
            </View>
          </View>
        </View>
        <View style={styles.grid}>
          <KeyValue label="Breed" value={c.breed} />
          <KeyValue label="Sex" value={c.sex === 'female' ? 'Female' : 'Male'} />
          <KeyValue label="Age" value={formatAge(c.age_months)} />
          <KeyValue label="Use" value={usageLabel(c.use_status)} />
          <KeyValue label="Owner" value={c.owner_name ?? '—'} />
          <KeyValue label="Village" value={c.village ?? '—'} />
        </View>
        <Button title="View full profile" onPress={() => router.push({ pathname: '/cattle/[id]', params: { id: c.id } })} />
        <Button title="Scan another" icon={RefreshCw} variant="ghost" onPress={onReset} />
      </Card>
    );
  }

  if (result.kind === 'other-owner') {
    return (
      <Banner
        tone="blue"
        icon={Lock}
        title="Registered to another owner"
        message="This animal is already registered, but it isn't in your herd, so its details are private. A veterinary doctor can view it."
      />
    );
  }

  if (result.kind === 'tag-not-found') {
    return <Banner tone="gold" icon={Search} title="No match" message={`No animal is registered with ear tag ${result.tag}.`} />;
  }

  const shot = result.shot;
  return (
    <Card style={styles.result}>
      <View style={styles.matchRow}>
        <Image source={shot.uri} style={styles.matchPhoto} contentFit="cover" accessibilityLabel="Scanned muzzle" />
        <View style={styles.flex}>
          <Text variant="heading">
            {result.kind === 'no-match' ? 'Not registered yet' : 'Muzzle detected'}
          </Text>
          <Text variant="caption" color={Colors.mutedForeground}>
            {result.kind === 'no-match'
              ? 'No registered animal matches this muzzle.'
              : `Muzzle found (${Math.round(shot.detection.confidence * 100)}% confidence), but identification needs the muzzle model server.`}
          </Text>
        </View>
      </View>
      <Button title="Register this animal" icon={Plus} onPress={() => onRegister(shot)} />
      <Button title="Scan again" icon={RefreshCw} variant="ghost" onPress={onReset} />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  header: { gap: Spacing.xs },
  row: { flexDirection: 'row', gap: Spacing.sm, alignSelf: 'stretch' },
  scanCard: { alignItems: 'center', gap: Spacing.lg },
  scanIcon: {
    width: 84,
    height: 84,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busy: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 56 },
  result: { gap: Spacing.md },
  resultHead: { flexDirection: 'row' },
  matchRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  matchPhoto: { width: 84, height: 84, borderRadius: Radius.md, backgroundColor: Colors.muted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.md, columnGap: Spacing.lg },
});
