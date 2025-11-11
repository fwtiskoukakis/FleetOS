import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FleetOSColorScheme, getFleetOSTheme, FleetOSDarkTheme, FleetOSLightTheme } from '../utils/brand-colors';

interface ThemeContextType {
  theme: FleetOSColorScheme;
  isDark: boolean;
  colors: ReturnType<typeof getFleetOSTheme>['colors'];
  typography: ReturnType<typeof getFleetOSTheme>['typography'];
  spacing: ReturnType<typeof getFleetOSTheme>['spacing'];
  borderRadius: ReturnType<typeof getFleetOSTheme>['borderRadius'];
  shadows: ReturnType<typeof getFleetOSTheme>['shadows'];
  toggleTheme: () => void;
  setTheme: (theme: FleetOSColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@fleetos_theme';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<FleetOSColorScheme>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preference
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setThemeState(savedTheme);
      } else {
        // Default to system preference
        setThemeState(systemColorScheme === 'dark' ? 'dark' : 'light');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
      setThemeState('light');
    } finally {
      setIsLoaded(true);
    }
  };

  const saveThemePreference = async (newTheme: FleetOSColorScheme) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const setTheme = (newTheme: FleetOSColorScheme) => {
    setThemeState(newTheme);
    saveThemePreference(newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const actualTheme = theme;
  const isDark = theme === 'dark';
  
  // Get theme values
  const themeValues = getFleetOSTheme(actualTheme);

  const contextValue: ThemeContextType = {
    theme,
    isDark,
    colors: themeValues.colors,
    typography: themeValues.typography,
    spacing: themeValues.spacing,
    borderRadius: themeValues.borderRadius,
    shadows: themeValues.shadows,
    toggleTheme,
    setTheme,
  };

  // Don't render until theme is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Convenience hooks for specific theme values
export function useThemeColors() {
  const { colors } = useTheme();
  return colors;
}

export function useIsDarkMode() {
  const { isDark } = useTheme();
  return isDark;
}

export function useThemeToggle() {
  const { toggleTheme, theme } = useTheme();
  return { toggleTheme, currentTheme: theme };
}
