import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../utils/design-system';
import { FleetOSColors } from '../utils/brand-colors';
import { useThemeColors } from '../contexts/theme-context';

interface TabItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const tabs: TabItem[] = [
  {
    key: 'home',
    label: 'Αρχική',
    icon: 'home',
    route: '/',
  },
  {
    key: 'contracts',
    label: 'Συμβόλαια',
    icon: 'document-text',
    route: '/contracts',
  },
  {
    key: 'cars',
    label: 'Στόλος',
    icon: 'car-sport',
    route: '/cars',
  },
];

interface BottomTabBarProps {
  onTabPress?: (tab: TabItem) => void;
}

export function BottomTabBar({ onTabPress }: BottomTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const colors = useThemeColors();

  function handleTabPress(tab: TabItem) {
    if (onTabPress) {
      onTabPress(tab);
    } else {
      router.push(tab.route);
    }
  }

  function isActive(route: string): boolean {
    if (route === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(route);
  }

  return (
    <View style={styles.container}>
      <BlurView intensity={80} tint="light" style={[styles.blurContainer, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const active = isActive(tab.route);
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tab}
                onPress={() => handleTabPress(tab)}
                activeOpacity={0.6}
              >
                {active && <View style={styles.activeBackground} />}
                <View style={styles.tabContent}>
                  <Ionicons 
                    name={tab.icon} 
                    size={active ? 26 : 24} 
                    color={active ? colors.primary : colors.textSecondary} 
                    style={styles.icon}
                  />
                  <Text 
                    style={[styles.tabLabel, active && styles.activeTabLabel, { color: active ? colors.primary : colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  blurContainer: {
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
  },
  tabBar: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    position: 'relative',
  },
  activeBackground: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    zIndex: 1,
  },
  icon: {
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10.5,
    color: '#8E8E93',
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  activeTabLabel: {
    fontWeight: '600',
    fontSize: 11,
  },
});
