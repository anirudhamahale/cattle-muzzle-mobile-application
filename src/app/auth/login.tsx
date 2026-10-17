import { Link } from 'expo-router';
import { CircleAlert, FlaskConical, LogIn, ScanFace } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ROLE_COPY, RoleSelector } from '@/components/role-selector';
import { Button } from '@/components/ui/button';
import { Banner, Screen } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { DEV_ACCOUNTS } from '@/db/seed';
import type { Role } from '@/db/types';
import { useAuth } from '@/lib/auth';

export default function Login() {
  const { logIn } = useAuth();
  const [role, setRole] = useState<Role>('owner');
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
      await logIn(phone, password, role);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.head}>
        <View style={styles.logo}>
          <ScanFace size={32} color={Colors.onPrimary} strokeWidth={1.8} />
        </View>
        <Text variant="display">Welcome back</Text>
        <Text color={Colors.mutedForeground}>Log in to Pashu Muzzle ID</Text>
      </View>

      <RoleSelector label="LOGIN AS" value={role} onChange={setRole} />

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
      {error && <Banner tone="red" icon={CircleAlert} title="Couldn't log in" message={error} />}
      {__DEV__ && (
        <Banner
          tone="blue"
          icon={FlaskConical}
          title="Test accounts (development builds only)"
          message={DEV_ACCOUNTS.map((a) => `${a.label}: ${a.phone} / ${a.password}`).join('\n')}
        />
      )}
      <Button
        title={`Log in as ${ROLE_COPY[role].title}`}
        icon={LogIn}
        size="lg"
        variant={role === 'doctor' ? 'accent' : 'primary'}
        onPress={submit}
        loading={busy}
      />
      <View style={styles.footer}>
        <Text color={Colors.mutedForeground}>New here?</Text>
        <Link href={{ pathname: '/auth/register', params: { role } }} style={styles.link}>
          Create a {ROLE_COPY[role].title.toLowerCase()} account
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center' },
  head: { gap: Spacing.xs, marginBottom: Spacing.sm },
  logo: {
    width: 60,
    height: 60,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  link: { color: Colors.primary, fontSize: 16, fontFamily: Fonts.bold, paddingVertical: 4 },
});
