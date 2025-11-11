/**
 * iOS 26 Liquid Glass Card Component
 * Reusable glass morphism card with blur effect
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Glass, BorderRadius, BlurIntensity } from '../utils/design-system';
import { useThemeColors } from '../contexts/theme-context';

interface GlassCardProps {
  children: React.ReactNode;
  variant?: 'ultraThin' | 'thin' | 'regular' | 'thick' | 'tinted';
  style?: ViewStyle;
  blurIntensity?: number;
  borderRadius?: number;
}

export function GlassCard({
  children,
  variant = 'regular',
  style,
  blurIntensity = BlurIntensity.regular,
  borderRadius = BorderRadius.card,
}: GlassCardProps) {
  const colors = useThemeColors();
  const glassStyle = Glass[variant];

  return (
    <BlurView 
      intensity={blurIntensity} 
      tint={colors.isDark ? "dark" : "light"} 
      style={[
        styles.container, 
        glassStyle, 
        { 
          borderRadius,
          backgroundColor: colors.glass,
          borderColor: colors.glassBorder,
        }, 
        style
      ]}
    >
      {children}
    </BlurView>
  );
}

/**
 * Simple glass card without blur (for performance)
 */
export function SimpleGlassCard({
  children,
  variant = 'regular',
  style,
  borderRadius = BorderRadius.card,
}: Omit<GlassCardProps, 'blurIntensity'>) {
  const colors = useThemeColors();
  const glassStyle = Glass[variant];

  return (
    <View style={[
      styles.container, 
      glassStyle, 
      { 
        borderRadius,
        backgroundColor: colors.card,
        borderColor: colors.border,
      }, 
      style
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

