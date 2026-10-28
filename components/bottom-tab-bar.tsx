import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();

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
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: colors.background }]}>
      <BlurView 
        intensity={65} 
        tint={colors.isDark ? "dark" : "light"} 
        style={[
          styles.blurContainer, 
          { 
            backgroundColor: colors.isDark ? 'rgba(34, 34, 34, 0.96)' : 'rgba(255, 255, 255, 0.96)',
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
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: active }}
              >
                {active && <View style={[styles.activeBackground, { backgroundColor: colors.isDark ? 'rgba(14, 165, 233, 0.25)' : 'rgba(14, 165, 233, 0.18)' }]} />}
                <View style={styles.tabContent}>
                  <Ionicons 
                    name={tab.icon} 
                    size={22}
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
    flexShrink: 0,
    paddingTop: 6,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  blurContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
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
    paddingVertical: 4,
    paddingHorizontal: 6,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    minHeight: 48,
    paddingHorizontal: 2,
    position: 'relative',
  },
  activeBackground: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    borderRadius: 17,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    zIndex: 1,
  },
  icon: {
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
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
