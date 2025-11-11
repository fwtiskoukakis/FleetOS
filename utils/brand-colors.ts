/**
 * FleetOS Brand Colors
 * Based on the official FleetOS logo design system
 */

export const FleetOSColors = {
  // Primary Brand Colors
  primary: {
    cyan: '#06B6D4', // cyan-500
    cyanLight: '#22D3EE', // cyan-400
    cyanDark: '#0891B2', // cyan-600
  },
  
  // Background Colors
  background: {
    dark: '#000000', // Pure black
    darkSecondary: '#111111', // Very dark gray
    light: '#ffffff',
    lightSecondary: '#f8fafc', // slate-50
  },
  
  // Text Colors
  text: {
    primary: '#0B132B', // Dark navy
    secondary: '#64748b', // slate-500
    light: '#ffffff',
    muted: '#94a3b8', // slate-400
  },
  
  // Accent Colors
  accent: {
    cyan: '#22D3EE', // cyan-400
    cyanGlow: '#06B6D4', // cyan-500 with glow effect
  },
  
  // Status Colors
  status: {
    success: '#10b981', // emerald-500
    warning: '#f59e0b', // amber-500
    error: '#ef4444', // red-500
    info: '#06B6D4', // cyan-500
  },
  
  // Gradient Definitions
  gradients: {
    primary: ['#06B6D4', '#22D3EE'],
    background: ['#0f172a', '#1e293b'],
    light: ['#ffffff', '#f8fafc'],
    // Header gradients for dark mode
    headerDark: [
      ['rgba(15,23,42,0.92)', 'rgba(14,165,233,0.24)'],
      ['rgba(12,74,110,0.9)', 'rgba(45,212,191,0.24)'],
      ['rgba(49,46,129,0.9)', 'rgba(192,132,252,0.25)'],
    ],
    // Header gradients for light mode (Sky Blues)
    headerLight: [
      ['rgba(240,249,255,0.95)', 'rgba(186,230,253,0.4)'],
      ['rgba(224,242,254,0.95)', 'rgba(147,197,253,0.4)'],
      ['rgba(239,246,255,0.95)', 'rgba(191,219,254,0.4)'],
    ],
  },
} as const;

export const FleetOSTypography = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  letterSpacing: {
    tight: '-0.5px',
    normal: '0px',
    wide: '0.5px',
  },
} as const;

export const FleetOSSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const FleetOSBorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const FleetOSShadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

export type FleetOSColorScheme = 'light' | 'dark' | 'automatic';

export const getFleetOSTheme = (scheme: FleetOSColorScheme = 'automatic') => {
  const isDark = scheme === 'dark' || (scheme === 'automatic' && false); // You can implement system theme detection here
  
  return {
    colors: {
      primary: FleetOSColors.primary.cyan,
      primaryLight: FleetOSColors.primary.cyanLight,
      primaryDark: FleetOSColors.primary.cyanDark,
      background: isDark ? FleetOSColors.background.dark : FleetOSColors.background.light,
      backgroundSecondary: isDark ? FleetOSColors.background.darkSecondary : FleetOSColors.background.lightSecondary,
      text: isDark ? FleetOSColors.text.light : FleetOSColors.text.primary,
      textSecondary: isDark ? '#ffffff' : FleetOSColors.text.secondary,
      textMuted: isDark ? '#cccccc' : FleetOSColors.text.muted,
      accent: FleetOSColors.accent.cyan,
      border: isDark ? '#333333' : '#e5e7eb',
      surface: isDark ? '#111111' : '#ffffff',
      surfaceElevated: isDark ? 'rgba(17, 17, 17, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      glass: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.7)',
      glassBorder: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.8)',
      headerGradients: isDark ? FleetOSColors.gradients.headerDark : FleetOSColors.gradients.headerLight,
      statusBarBackground: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(240,249,255,0.95)',
      ...FleetOSColors.status,
    },
    typography: FleetOSTypography,
    spacing: FleetOSSpacing,
    borderRadius: FleetOSBorderRadius,
    shadows: FleetOSShadows,
    isDark,
  };
};

// Dark mode specific theme
export const FleetOSDarkTheme = getFleetOSTheme('dark');

// Light mode specific theme  
export const FleetOSLightTheme = getFleetOSTheme('light');

export default FleetOSColors;
