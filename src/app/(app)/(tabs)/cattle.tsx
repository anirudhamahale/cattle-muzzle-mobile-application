import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Beef, Search, X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CattleCard } from '@/components/cattle-card';
import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip-group';
import { EmptyState } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { Colors, Fonts, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { listCattle, type CattleFilter } from '@/db/cattle';
import type { Cattle } from '@/db/types';
import { useCurrentUser } from '@/lib/auth';

type FilterKey = 'all' | 'female' | 'male' | 'care' | 'buffalo';
const FILTERS: { value: FilterKey; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'buffalo', label: 'Buffalo' },
  { value: 'care', label: 'Sick' },
];

const toFilter = (key: FilterKey, search: string): CattleFilter => ({
  search,
  sex: key === 'female' || key === 'male' ? key : undefined,
  species: key === 'buffalo' ? 'buffalo' : undefined,
  health: key === 'care' ? 'sick' : undefined,
});

export default function CattleList() {
  const db = useSQLiteContext();
  const user = useCurrentUser();
  const [items, setItems] = useState<Cattle[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setItems(await listCattle(db, user, toFilter(filter, search)));
    setLoaded(true);
  }, [db, user, filter, search]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const renderItem = useCallback(
    ({ item }: { item: Cattle }) => <CattleCard cattle={item} showOwner={user.role === 'doctor'} />,
    [user.role],
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">
          {user.role === 'doctor' ? 'All cattle' : 'My cattle'}
        </Text>
        <View style={styles.search}>
          <Search size={20} color={Colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={user.role === 'doctor' ? 'Name, tag, breed or owner' : 'Name, tag or breed'}
            placeholderTextColor={Colors.mutedForeground}
            accessibilityLabel="Search cattle"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
              <X size={18} color={Colors.mutedForeground} />
            </Pressable>
          )}
        </View>
        <ChipGroup options={FILTERS} value={filter} onChange={setFilter} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        windowSize={7}
        ListHeaderComponent={
          items.length > 0 ? (
            <Text variant="caption" color={Colors.mutedForeground}>
              {items.length} {items.length === 1 ? 'animal' : 'animals'}
            </Text>
          ) : undefined
        }
        ListEmptyComponent={
          loaded ? (
            <EmptyState
              icon={Beef}
              title={search || filter !== 'all' ? 'No matches' : 'No cattle yet'}
              message={
                search || filter !== 'all'
                  ? 'Try a different search or filter.'
                  : 'Register an animal by scanning its muzzle — it takes under a minute.'
              }
              action={
                !search && filter === 'all' ? (
                  <Button title="Register cattle" onPress={() => router.navigate('/add')} />
                ) : undefined
              }
            />
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}

const Separator = () => <View style={{ height: Spacing.md }} />;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: TouchTarget + 4,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.card,
  },
  searchInput: { flex: 1, fontFamily: Fonts.regular, fontSize: 16, color: Colors.foreground, paddingVertical: Spacing.md },
  list: { padding: Spacing.lg, paddingTop: 0, paddingBottom: Spacing.xxl },
});
