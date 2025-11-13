import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initializeAADE } from '../utils/aade-config';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { NotificationBackgroundJobs } from '../services/notification-background-jobs.service';
import { ThemeProvider } from '../contexts/theme-context';
import { useNotifications } from '../hooks/useNotifications';
import { LoadingScreen } from '../components/loading-screen';

/**
 * Root layout component with authentication protection
 */
export default function RootLayout() {
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();
  
  // Initialize notification listeners
  useNotifications();

  useEffect(() => {
    // Initialize AADE service on app startup
    initializeAADE();

    // Check authentication status
    checkAuthStatus();
    
    // Initialize notifications
    initializeNotifications();

    // Listen to auth state changes
    const { data } = AuthService.onAuthStateChange((event, session) => {
      const isSignedIn = !!session?.user;
      setIsAuthenticated(isSignedIn);
      
      if (event === 'SIGNED_OUT') {
        router.replace('/auth/sign-in');
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  async function checkAuthStatus() {
    const user = await AuthService.getCurrentUser();
    setIsAuthenticated(!!user);
    setIsAuthInitialized(true);
  }

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  async function initializeNotifications() {
    try {
      // Initialize and get push token
      const token = await NotificationService.initialize();
      
      if (token) {
        console.log('Push notifications initialized successfully');
        
        // Save token to database if user is authenticated
        const user = await AuthService.getCurrentUser();
        if (user) {
          await NotificationService.savePushToken(user.id, token);
        }
      }

      // Start background jobs for operational notifications
      await NotificationBackgroundJobs.startBackgroundJobs();
      console.log('Notification background jobs started');
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  useEffect(() => {
    if (!isAuthInitialized) return;

    const inAuthGroup = segments[0] === 'auth';
    const isResetPassword = segments[1] === 'reset-password';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to sign in if not authenticated
      router.replace('/auth/sign-in');
    } else if (isAuthenticated && inAuthGroup && !isResetPassword) {
      // Redirect to main app if authenticated and in auth screens (except reset-password)
      router.replace('/(tabs)/');
    }
  }, [isAuthenticated, segments, isAuthInitialized]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          {isLoading ? (
            <LoadingScreen onLoadingComplete={handleLoadingComplete} />
          ) : (
            <Stack
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="auth/sign-in" />
              <Stack.Screen name="auth/sign-up" />
              <Stack.Screen name="auth/reset-password" />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="new-contract" />
              <Stack.Screen name="contract-details" />
              <Stack.Screen name="edit-contract" />
              <Stack.Screen name="car-details" />
              <Stack.Screen name="user-management" />
              <Stack.Screen name="aade-settings" />
              <Stack.Screen name="notification-settings" />
              <Stack.Screen name="dark-mode-test" />
            </Stack>
          )}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

