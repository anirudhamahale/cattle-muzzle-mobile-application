import { Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import type { User } from '@/db/types';

import { ChipGroup } from './ui/chip-group';
import { Text } from './ui/text';

const MAX_VISIBLE = 12;

/** Lets a doctor choose which registered owner an animal belongs to. */
export function OwnerPicker({ owners, value, onChange, error }: {
  owners: User[];
  value: string | null;
  onChange: (id: string) => void;
  error?: string | null;
}) {
  const [query, setQuery] = useState('');
  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = owners.filter(
      (o) => !q || o.name.toLowerCase().includes(q) || o.phone.includes(q) || o.org_name?.toLowerCase().includes(q),
    );
    // Keep the current selection visible even when it falls outside the filter.
    const selected = owners.find((o) => o.id === value);
    const list = matches.slice(0, MAX_VISIBLE);
    if (selected && !list.includes(selected)) list.unshift(selected);
    return list.map((o) => ({
      value: o.id,
      label: o.owner_type === 'gaushala' && o.org_name ? o.org_name : o.name,
    }));
  }, [owners, query, value]);

  if (owners.length === 0) {
    return (
      <Text color={Colors.destructive}>
        No owner accounts exist yet. Ask the gaushala or farmer to create an account first.
      </Text>
    );
  }

  return (
    <View style={styles.wrap}>
      {owners.length > MAX_VISIBLE && (
        <View style={styles.search}>
          <Search size={18} color={Colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search owner by name or phone"
            placeholderTextColor={Colors.mutedForeground}
            accessibilityLabel="Search owners"
            style={styles.input}
          />
        </View>
      )}
      <ChipGroup label="Owner" required options={options} value={value} onChange={onChange} error={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.card,
  },
  input: { flex: 1, fontFamily: Fonts.regular, fontSize: 16, color: Colors.foreground },
});
