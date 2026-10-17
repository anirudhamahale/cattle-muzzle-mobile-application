import { Tabs } from 'expo-router/js-tabs';
import { House, List, Plus, ScanSearch, UserRound } from 'lucide-react-native';

import { Colors, Fonts } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.mutedForeground,
        tabBarLabelStyle: { fontFamily: Fonts.semibold, fontSize: 12 },
        tabBarStyle: { backgroundColor: Colors.card, borderTopColor: Colors.border, minHeight: 64 },
        sceneStyle: { backgroundColor: Colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="cattle"
        options={{ title: 'All cattle', tabBarIcon: ({ color, size }) => <List color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="scan"
        options={{ title: 'Scan', tabBarIcon: ({ color, size }) => <ScanSearch color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="add"
        options={{ title: 'Add cow', tabBarIcon: ({ color, size }) => <Plus color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} /> }}
      />
    </Tabs>
  );
}
