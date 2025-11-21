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
  {
    key: 'booking',
    label: 'Book Online',
    icon: 'globe-outline',
    route: '/book-online',
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
      <BlurView 
        intensity={65} 
        tint={colors.isDark ? "dark" : "light"} 
        style={[
          styles.blurContainer, 
          { 
            backgroundColor: colors.isDark ? 'rgba(34, 34, 34, 0.85)' : 'rgba(255, 255, 255, 0.18)',
            borderColor: colors.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.35)',
          }
        ]}
      >
        <View style={[styles.glassEdge, { backgroundColor: colors.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.55)' }]} />
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const active = isActive(tab.route);
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tab}
                onPress={() => handleTabPress(tab)}
                activeOpacity={0.65}
              >
                {active && <View style={[styles.activeBackground, { backgroundColor: colors.isDark ? 'rgba(14, 165, 233, 0.25)' : 'rgba(14, 165, 233, 0.18)' }]} />}
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
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  blurContainer: {
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 14,
  },
  glassEdge: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    opacity: 0.9,
  },
  tabBar: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 6,
    minHeight: 74,
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
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    borderRadius: 22,
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
    color: 'rgba(60, 60, 67, 0.55)',
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  activeTabLabel: {
    fontWeight: '600',
    fontSize: 11,
  },
});
