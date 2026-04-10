import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { router } from 'expo-router';
import 'react-native-reanimated';
import { isUserLoggedIn } from '../lib/auth';

export default function RootLayout() {
  // Always render the Stack first so routes are registered before any redirect
  useEffect(() => {
    isUserLoggedIn().then(loggedIn => {
      if (!loggedIn) {
        router.replace('/login');
      }
    });
  }, []);

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login"  options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="signup" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
