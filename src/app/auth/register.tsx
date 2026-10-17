import { useLocalSearchParams } from 'expo-router';
import { CircleAlert, MapPin, ShieldCheck, UserRound, UserRoundPlus } from 'lucide-react-native';
import { useState } from 'react';

import { RoleSelector } from '@/components/role-selector';
import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip-group';
import { Banner, Screen, Section } from '@/components/ui/layout';
import { TextField } from '@/components/ui/text-field';
import type { OwnerType, Role } from '@/db/types';
import { useAuth } from '@/lib/auth';

const OWNER_TYPES = [
  { value: 'farmer' as const, label: 'Independent farmer' },
  { value: 'gaushala' as const, label: 'Gaushala' },
];

type Errors = Partial<Record<'name' | 'phone' | 'password' | 'confirm' | 'org' | 'reg', string>>;

export default function Register() {
  const params = useLocalSearchParams<{ role?: Role }>();
  const { register } = useAuth();
  const [role, setRole] = useState<Role>(params.role === 'doctor' ? 'doctor' : 'owner');
  const [ownerType, setOwnerType] = useState<OwnerType>('farmer');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [org, setOrg] = useState('');
  const [reg, setReg] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isDoctor = role === 'doctor';
  const isGaushala = !isDoctor && ownerType === 'gaushala';

  function validate(): Errors {
    const e: Errors = {};
    if (name.trim().length < 2) e.name = 'Enter your full name.';
    if (phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a valid 10-digit mobile number.';
    if (password.length < 6) e.password = 'Use at least 6 characters.';
    if (confirm !== password) e.confirm = "Passwords don't match.";
    if (isGaushala && !org.trim()) e.org = 'Enter the gaushala name.';
    if (isDoctor && !reg.trim()) e.reg = 'Registration number is required for doctors.';
    return e;
  }

  async function submit() {
    setFormError(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await register({
        role,
        owner_type: isDoctor ? null : ownerType,
        name,
        phone,
        password,
        org_name: org,
        registration_no: reg,
        village,
        district,
        state,
      });
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={[]}>
      <RoleSelector label="SIGN UP AS" value={role} onChange={setRole} />

      <Section title={isDoctor ? 'Doctor details' : 'Your details'} icon={UserRound}>
        {!isDoctor && (
          <ChipGroup label="I am a" options={OWNER_TYPES} value={ownerType} onChange={setOwnerType} required />
        )}
        <TextField label="Full name" value={name} onChangeText={setName} error={errors.name} required autoComplete="name" />
        {isGaushala && (
          <>
            <TextField label="Gaushala name" value={org} onChangeText={setOrg} error={errors.org} required />
            <TextField
              label="Gaushala registration no."
              value={reg}
              onChangeText={setReg}
              hint="Optional — trust / society / Animal Welfare Board registration"
            />
          </>
        )}
        {isDoctor && (
          <>
            <TextField
              label="Veterinary council registration no."
              value={reg}
              onChangeText={setReg}
              error={errors.reg}
              required
              autoCapitalize="characters"
              hint="VCI or State Veterinary Council registration"
            />
            <TextField label="Hospital / clinic" value={org} onChangeText={setOrg} hint="Optional" />
          </>
        )}
      </Section>

      <Section title="Login" icon={ShieldCheck}>
        <TextField
          label="Mobile number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          error={errors.phone}
          required
          maxLength={14}
        />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry error={errors.password} required autoComplete="new-password" />
        <TextField label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry error={errors.confirm} required />
      </Section>

      <Section title="Location" icon={MapPin}>
        {!isDoctor && <TextField label="Village / ward" value={village} onChangeText={setVillage} />}
        <TextField label="District" value={district} onChangeText={setDistrict} />
        <TextField label="State" value={state} onChangeText={setState} />
      </Section>

      {formError && <Banner tone="red" icon={CircleAlert} title="Couldn't create account" message={formError} />}
      <Button title="Create account" icon={UserRoundPlus} size="lg" onPress={submit} loading={busy} />
    </Screen>
  );
}
