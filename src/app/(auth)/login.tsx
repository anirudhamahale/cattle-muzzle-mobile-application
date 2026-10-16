import { Link, useLocalSearchParams } from 'expo-router';
import { CircleAlert, LogIn } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip-group';
import { Banner, Screen } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import type { Role } from '@/db/types';
import { useAuth } from '@/lib/auth';

const ROLES = [
  { value: 'owner' as const, label: 'Owner' },
  { value: 'doctor' as const, label: 'Doctor' },
];

export default function Login() {
  const params = useLocalSearchParams<{ role?: Role }>();
  const { signIn } = useAuth();
  const [role, setRole] = useState<Role>(params.role === 'doctor' ? 'doctor' : 'owner');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    if (phone.replace(/\D/g, '').length < 10 || !password) {
      setError('Enter your 10-digit mobile number and password.');
      return;
    }
    setBusy(true);
    try {
      await signIn(phone, password, role);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={[]}>
      <View style={styles.head}>
        <Text variant="title">Sign in</Text>
        <Text color={Colors.mutedForeground}>
          {role === 'doctor' ? 'Veterinary doctor account' : 'Gaushala or farmer account'}
        </Text>
      </View>
      <ChipGroup label="Account type" options={ROLES} value={role} onChange={setRole} />
      <TextField
        label="Mobile number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        placeholder="10-digit mobile number"
        maxLength={14}
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={submit}
        returnKeyType="go"
      />
      {error && <Banner tone="red" icon={CircleAlert} title="Couldn't sign in" message={error} />}
      <Button title="Sign in" icon={LogIn} size="lg" onPress={submit} loading={busy} />
      <View style={styles.footer}>
        <Text color={Colors.mutedForeground}>New here?</Text>
        <Link href={{ pathname: '/register', params: { role } }} style={styles.link}>
          Create an account
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: Spacing.xs },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  link: { color: Colors.primary, fontSize: 16, fontFamily: Fonts.bold, paddingVertical: 4 },
});
