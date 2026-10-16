import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Save } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip-group';
import { Screen } from '@/components/ui/layout';
import { TextField } from '@/components/ui/text-field';
import { COMMON_VACCINES, HEALTH_RECORD_TYPES, HEALTH_STATUSES, type HealthStatus } from '@/constants/cattle';
import { addHealthRecord, getCattle } from '@/db/cattle';
import { useCurrentUser } from '@/lib/auth';
import { addDays, isRealDate, today } from '@/lib/dates';

const DUE_PRESETS = [
  { value: '0', label: 'None' },
  { value: '21', label: '+21 days' },
  { value: '90', label: '+3 months' },
  { value: '182', label: '+6 months' },
  { value: '365', label: '+1 year' },
];

export default function HealthRecordScreen() {
  const { cattleId } = useLocalSearchParams<{ cattleId: string }>();
  const db = useSQLiteContext();
  const user = useCurrentUser();
  const [type, setType] = useState('checkup');
  const [vaccine, setVaccine] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(today());
  const [duePreset, setDuePreset] = useState('0');
  const [nextDue, setNextDue] = useState('');
  const [health, setHealth] = useState<HealthStatus>('healthy');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCattle(db, cattleId).then((c) => c && setHealth(c.health_status));
  }, [db, cattleId]);

  // Only doctors may add records; this screen is unreachable otherwise, but guard anyway.
  if (user.role !== 'doctor') return null;

  function chooseDue(preset: string) {
    setDuePreset(preset);
    setNextDue(preset === '0' ? '' : addDays(isRealDate(date) ? date : today(), Number(preset)));
  }

  async function save() {
    const finalTitle = title.trim() || (type === 'vaccination' && vaccine ? `${vaccine} vaccination` : '');
    if (!finalTitle) return Alert.alert('Add a title', 'Describe the visit, e.g. "FMD booster" or "Mastitis treatment".');
    if (!isRealDate(date)) return Alert.alert('Check the date', 'Use the format YYYY-MM-DD.');
    if (nextDue && !isRealDate(nextDue)) return Alert.alert('Check the next due date', 'Use the format YYYY-MM-DD.');
    setSaving(true);
    try {
      await addHealthRecord(db, {
        cattle_id: cattleId,
        doctor_id: user.id,
        type,
        title: finalTitle,
        notes,
        record_date: date,
        next_due: nextDue || null,
        health_status: health,
      });
      router.back();
    } catch (e) {
      Alert.alert('Could not save', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen edges={['bottom']}>
      <ChipGroup label="Record type" required options={HEALTH_RECORD_TYPES} value={type} onChange={setType} />
      {type === 'vaccination' && (
        <ChipGroup
          label="Vaccine"
          options={COMMON_VACCINES.map((v) => ({ value: v, label: v }))}
          value={vaccine}
          onChange={setVaccine}
          allowDeselect
          onClear={() => setVaccine(null)}
        />
      )}
      <TextField
        label="Title"
        required={!(type === 'vaccination' && vaccine)}
        value={title}
        onChangeText={setTitle}
        placeholder={type === 'vaccination' && vaccine ? `${vaccine} vaccination` : 'e.g. Routine check-up'}
      />
      <TextField label="Date" required value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" maxLength={10} />
      <ChipGroup label="Next due" options={DUE_PRESETS} value={duePreset} onChange={chooseDue} />
      <TextField label="Next due date" value={nextDue} onChangeText={setNextDue} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" maxLength={10} hint="Shows on the dashboard when it's within a week" />
      <TextField label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Findings, dosage, batch number…" />
      <ChipGroup label="Health status after this visit" options={HEALTH_STATUSES} value={health} onChange={setHealth} />
      <Button title="Save record" icon={Save} size="lg" variant="accent" onPress={save} loading={saving} />
    </Screen>
  );
}
