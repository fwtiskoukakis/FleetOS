import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../utils/design-system';
import { useThemeColors } from '../contexts/theme-context';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHomeIcon?: boolean;
}

/**
 * Modern Breadcrumb Component
 * Beautiful navigation trail with icons and hover effects
 */
export function Breadcrumb({ items, showHomeIcon = true }: BreadcrumbProps) {
  const router = useRouter();
  const colors = useThemeColors();

  function handlePress(path?: string) {
    if (path) {
      router.push(path as any);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.breadcrumbTrail}>
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {/* Separator */}
            {index > 0 && (
              <View style={styles.separatorContainer}>
                <Ionicons 
                  name="chevron-forward" 
                  size={14} 
                  color={colors.textSecondary} 
                />
              </View>
            )}

            {/* Breadcrumb Item */}
            {item.path ? (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => handlePress(item.path)}
                activeOpacity={0.7}
              >
                {item.icon && index === 0 && showHomeIcon && (
                  <Ionicons 
                    name={item.icon} 
                    size={14} 
                    color={colors.primary} 
                    style={styles.icon}
                  />
                )}
                <Text style={[styles.linkText, { color: colors.primary }]}>{item.label}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.currentItem}>
                {item.icon && (
                  <Ionicons 
                    name={item.icon} 
                    size={14} 
                    color={colors.text} 
                    style={styles.icon}
                  />
                )}
                <Text style={[styles.currentText, { color: colors.text }]}>{item.label}</Text>
              </View>
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  breadcrumbTrail: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  separatorContainer: {
    marginHorizontal: 6,
    opacity: 0.5,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.primary + '08',
  },
  icon: {
    marginRight: 4,
  },
  linkText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  currentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.background,
  },
  currentText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
