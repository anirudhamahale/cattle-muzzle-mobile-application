import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import {
  Camera,
  CircleAlert,
  HeartPulse,
  Images,
  Locate,
  MapPin,
  Milk,
  NotebookPen,
  ScanFace,
  Tag,
  UserRound,
} from 'lucide-react-native';
import { useCallback, useReducer, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { MuzzlePanel } from '@/components/muzzle-panel';
import { OwnerPicker } from '@/components/owner-picker';
import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip-group';
import { Badge, Banner, Screen, Section } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import {
  ageCategory,
  BREEDS,
  breedTypesFor,
  EAR_TAG_PATTERN,
  HEALTH_STATUSES,
  SEXES,
  SPECIES,
  usesFor,
  type BreedType,
  type HealthStatus,
  type Sex,
  type Species,
} from '@/constants/cattle';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { createCattle, findMuzzleMatches } from '@/db/cattle';
import type { User } from '@/db/types';
import { listOwners } from '@/db/users';
import { useCurrentUser } from '@/lib/auth';
import { captureStore, useCapture } from '@/lib/capture-store';
import { averageEmbedding, isUsableShot, MIN_SHOTS, muzzleEngine } from '@/lib/muzzle';

type Form = {
  ownerId: string | null;
  name: string;
  tag: string;
  species: Species;
  breedType: BreedType;
  breed: string | null;
  sex: Sex | null;
  ageYears: string;
  ageMonths: string;
  colorMarks: string;
  use: string | null;
  pregnant: 'yes' | 'no';
  lactation: string;
  milkYield: string;
  weight: string;
  health: HealthStatus;
  village: string;
  district: string;
  state: string;
  coords: { latitude: number; longitude: number } | null;
  bodyPhoto: string | null;
  notes: string;
};

type Action = { type: 'set'; patch: Partial<Form> } | { type: 'reset'; user: User };

const initialForm = (user: User): Form => ({
  ownerId: user.role === 'owner' ? user.id : null,
  name: '',
  tag: '',
  species: 'cattle',
  breedType: 'indigenous',
  breed: null,
  sex: null,
  ageYears: '',
  ageMonths: '',
  colorMarks: '',
  use: null,
  pregnant: 'no',
  lactation: '',
  milkYield: '',
  weight: '',
  health: 'healthy',
  village: user.village ?? '',
  district: user.district ?? '',
  state: user.state ?? '',
  coords: null,
  bodyPhoto: null,
  notes: '',
});

function reducer(state: Form, action: Action): Form {
  if (action.type === 'reset') return initialForm(action.user);
  const next = { ...state, ...action.patch };
  // Keep dependent fields valid when their parent changes.
  if (action.patch.species && !breedTypesFor(next.species).some((t) => t.value === next.breedType)) {
    next.breedType = 'indigenous';
  }
  if (action.patch.species || action.patch.breedType) next.breed = null;
  if (action.patch.sex) {
    next.use = null;
    next.pregnant = 'no';
  }
  return next;
}

type Errors = Partial<Record<'muzzle' | 'owner' | 'tag' | 'breed' | 'sex' | 'age' | 'use', string>>;

const YES_NO = [
  { value: 'no' as const, label: 'No' },
  { value: 'yes' as const, label: 'Yes' },
];

const toNumber = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')));

export default function AddCattle() {
  const db = useSQLiteContext();
  const user = useCurrentUser();
  const { shots, videoUri } = useCapture();
  const [form, dispatch] = useReducer(reducer, user, initialForm);
  const [owners, setOwners] = useState<User[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const set = (patch: Partial<Form>) => dispatch({ type: 'set', patch });
  const isDoctor = user.role === 'doctor';

  useFocusEffect(
    useCallback(() => {
      if (isDoctor) listOwners(db).then(setOwners);
    }, [db, isDoctor]),
  );

  const usableShots = shots.filter(isUsableShot);
  const ageTotal = (Number(form.ageYears) || 0) * 12 + (Number(form.ageMonths) || 0);
  const hasAge = form.ageYears.trim() !== '' || form.ageMonths.trim() !== '';
  const censusBand = form.sex && hasAge ? ageCategory(form.species, form.breedType, form.sex, ageTotal) : null;

  async function captureLocation() {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Location permission denied', 'You can still type the village and district.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      set({ coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } });
      const [place] = await Location.reverseGeocodeAsync(pos.coords).catch(() => []);
      if (place) {
        set({
          village: form.village || place.city || place.subregion || '',
          district: form.district || place.subregion || place.district || '',
          state: form.state || place.region || '',
        });
      }
    } catch (e) {
      Alert.alert('Could not get location', (e as Error).message);
    } finally {
      setLocating(false);
    }
  }

  async function pickBodyPhoto(fromCamera: boolean) {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [4, 3] };
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
    }
    const r = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!r.canceled) set({ bodyPhoto: r.assets[0].uri });
  }

  function validate(): Errors {
    const e: Errors = {};
    if (usableShots.length < MIN_SHOTS) e.muzzle = 'Add at least one clear muzzle photo.';
    if (!form.ownerId) e.owner = 'Choose the owner.';
    if (form.tag.trim() && !EAR_TAG_PATTERN.test(form.tag.trim())) e.tag = 'Ear tag numbers are 12 digits.';
    if (!form.breed) e.breed = 'Choose a breed.';
    if (!form.sex) e.sex = 'Choose the sex.';
    if (!hasAge || ageTotal <= 0 || ageTotal > 30 * 12 || Number(form.ageMonths) > 11) e.age = 'Enter a valid age (months 0–11).';
    if (!form.use) e.use = 'Choose the current use.';
    return e;
  }

  async function save() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      Alert.alert('Check the form', Object.values(e).join('\n'));
      return;
    }

    setSaving('Reading muzzle prints…');
    let embedding: number[] | null = null;
    try {
      const embeddings = await Promise.all(usableShots.map((s) => muzzleEngine.embed(s)));
      embedding = averageEmbedding(embeddings.filter((x): x is number[] => !!x));
      if (embedding) {
        setSaving('Checking for duplicates…');
        const matches = await findMuzzleMatches(db, embedding);
        if (matches.length > 0) {
          const m = matches[0];
          const proceed = await confirmDuplicate(
            `${m.name || m.tag_number || 'An animal'} owned by ${m.owner_name} matches this muzzle (${Math.round(m.score * 100)}% similar).`,
            m.id,
          );
          if (!proceed) return;
        }
      }
    } catch (err) {
      const proceed = await confirm(
        'Muzzle service unavailable',
        `${(err as Error).message}\n\nSave without the identity check? It can be added later.`,
      );
      if (!proceed) return;
    } finally {
      setSaving(null);
    }

    setSaving('Saving…');
    try {
      const id = await createCattle(db, {
        owner_id: form.ownerId!,
        created_by: user.id,
        name: form.name,
        tag_number: form.tag,
        species: form.species,
        breed_type: form.breedType,
        breed: form.breed!,
        sex: form.sex!,
        age_months: ageTotal,
        color_marks: form.colorMarks,
        use_status: form.use,
        is_pregnant: form.sex === 'female' && form.pregnant === 'yes',
        lactation_no: form.sex === 'female' ? toNumber(form.lactation) : null,
        milk_yield_lpd: form.use === 'in_milk' ? toNumber(form.milkYield) : null,
        weight_kg: toNumber(form.weight),
        health_status: form.health,
        village: form.village,
        district: form.district,
        state: form.state,
        latitude: form.coords?.latitude ?? null,
        longitude: form.coords?.longitude ?? null,
        notes: form.notes,
        shots: usableShots,
        video_uri: videoUri,
        body_photo_uri: form.bodyPhoto,
        embedding,
        detector: muzzleEngine.id,
      });
      captureStore.reset();
      dispatch({ type: 'reset', user });
      setErrors({});
      router.push({ pathname: '/cattle/[id]', params: { id } });
    } catch (err) {
      Alert.alert('Could not save', (err as Error).message);
    } finally {
      setSaving(null);
    }
  }

  const breedOptions = BREEDS[form.species][form.breedType].map((b) => ({ value: b, label: b }));

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">Register cattle</Text>
        <Text color={Colors.mutedForeground}>Fields marked * are required.</Text>
      </View>

      <Section title="Muzzle scan" icon={ScanFace}>
        <MuzzlePanel error={errors.muzzle} />
      </Section>

      {isDoctor && (
        <Section title="Owner" icon={UserRound}>
          <OwnerPicker self={user} owners={owners} value={form.ownerId} onChange={(ownerId) => set({ ownerId })} error={errors.owner} />
        </Section>
      )}

      <Section title="Identity" icon={Tag}>
        <TextField label="Name" value={form.name} onChangeText={(name) => set({ name })} placeholder="e.g. Lakshmi" hint="Optional" />
        <TextField
          label="Ear tag number"
          value={form.tag}
          onChangeText={(tag) => set({ tag: tag.replace(/\D/g, '') })}
          keyboardType="number-pad"
          maxLength={12}
          error={errors.tag}
          hint="12-digit Pashu Aadhaar / INAPH tag, if tagged"
        />
        <ChipGroup label="Species" required options={SPECIES} value={form.species} onChange={(species) => set({ species })} />
        <ChipGroup label="Breed type" required options={breedTypesFor(form.species)} value={form.breedType} onChange={(breedType) => set({ breedType })} />
        <ChipGroup label="Breed" required options={breedOptions} value={form.breed} onChange={(breed) => set({ breed })} error={errors.breed} />
        <ChipGroup label="Sex" required options={SEXES} value={form.sex} onChange={(sex) => set({ sex })} error={errors.sex} />
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField label="Age (years)" required value={form.ageYears} onChangeText={(ageYears) => set({ ageYears: ageYears.replace(/\D/g, '') })} keyboardType="number-pad" maxLength={2} />
          </View>
          <View style={styles.flex}>
            <TextField label="+ months" value={form.ageMonths} onChangeText={(ageMonths) => set({ ageMonths: ageMonths.replace(/\D/g, '') })} keyboardType="number-pad" maxLength={2} />
          </View>
        </View>
        {errors.age ? (
          <Text variant="caption" color={Colors.destructive}>{errors.age}</Text>
        ) : censusBand ? (
          <Badge label={`Census age band: ${censusBand}`} tone="blue" />
        ) : null}
        <TextField label="Colour & identifying marks" value={form.colorMarks} onChangeText={(colorMarks) => set({ colorMarks })} placeholder="e.g. Red with white forehead star" />
      </Section>

      <Section title="Use & production" icon={Milk}>
        {form.sex ? (
          <ChipGroup label="Current use" required options={usesFor(form.sex)} value={form.use} onChange={(use) => set({ use })} error={errors.use} />
        ) : (
          <Text color={Colors.mutedForeground}>Choose the sex first — use options differ for males and females.</Text>
        )}
        {form.sex === 'female' && (
          <>
            <ChipGroup label="Pregnant" options={YES_NO} value={form.pregnant} onChange={(pregnant) => set({ pregnant })} />
            <TextField label="Number of calvings" value={form.lactation} onChangeText={(lactation) => set({ lactation: lactation.replace(/\D/g, '') })} keyboardType="number-pad" maxLength={2} />
          </>
        )}
        {form.use === 'in_milk' && (
          <TextField label="Milk yield" suffix="L/day" value={form.milkYield} onChangeText={(milkYield) => set({ milkYield })} keyboardType="decimal-pad" maxLength={5} />
        )}
        <TextField label="Body weight" suffix="kg" value={form.weight} onChangeText={(weight) => set({ weight })} keyboardType="decimal-pad" maxLength={6} hint="Optional — estimate is fine" />
      </Section>

      <Section title="Health" icon={HeartPulse}>
        <ChipGroup label="Current health" options={HEALTH_STATUSES} value={form.health} onChange={(health) => set({ health })} />
      </Section>

      <Section title="Location" icon={MapPin}>
        <Button
          title={form.coords ? `GPS ${form.coords.latitude.toFixed(5)}, ${form.coords.longitude.toFixed(5)}` : 'Use current location'}
          icon={Locate}
          variant={form.coords ? 'secondary' : 'outline'}
          loading={locating}
          onPress={captureLocation}
        />
        <TextField label="Village / ward" value={form.village} onChangeText={(village) => set({ village })} />
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField label="District" value={form.district} onChangeText={(district) => set({ district })} />
          </View>
          <View style={styles.flex}>
            <TextField label="State" value={form.state} onChangeText={(state) => set({ state })} />
          </View>
        </View>
      </Section>

      <Section title="Side profile photo" icon={Camera}>
        {form.bodyPhoto && <Image source={form.bodyPhoto} style={styles.bodyPhoto} contentFit="cover" accessibilityLabel="Side profile photo" />}
        <View style={styles.row}>
          <Button title={form.bodyPhoto ? 'Retake' : 'Camera'} icon={Camera} variant="outline" style={styles.flex} onPress={() => pickBodyPhoto(true)} />
          <Button title="Gallery" icon={Images} variant="outline" style={styles.flex} onPress={() => pickBodyPhoto(false)} />
        </View>
        <Text variant="caption" color={Colors.mutedForeground}>Optional. A full side view helps confirm breed and markings.</Text>
      </Section>

      <Section title="Notes" icon={NotebookPen}>
        <TextField label="Notes" value={form.notes} onChangeText={(notes) => set({ notes })} multiline placeholder="Purchase source, temperament, history…" />
      </Section>

      {Object.keys(errors).length > 0 && (
        <Banner tone="red" icon={CircleAlert} title="Some fields need attention" message={Object.values(errors).join(' ')} />
      )}
      <Button title={saving ?? 'Save cattle'} icon={ScanFace} size="lg" onPress={save} loading={!!saving} />
    </Screen>
  );
}

function confirm(title: string, message: string) {
  return new Promise<boolean>((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Continue', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }),
  );
}

function confirmDuplicate(message: string, existingId: string) {
  return new Promise<boolean>((resolve) =>
    Alert.alert('Possible duplicate', message, [
      {
        text: 'View existing',
        onPress: () => {
          resolve(false);
          router.push({ pathname: '/cattle/[id]', params: { id: existingId } });
        },
      },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Register anyway', style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }),
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: Spacing.xs },
  row: { flexDirection: 'row', gap: Spacing.md },
  bodyPhoto: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.md },
});
