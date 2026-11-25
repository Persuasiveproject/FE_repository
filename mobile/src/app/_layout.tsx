import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppShell } from '@/components/app-shell';
import { SessionProvider } from '@/features/session/session-provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SessionProvider>
        <AnimatedSplashOverlay />
        <AppShell>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="discussions/[id]" />
          <Stack.Screen name="discussions/create" />
          <Stack.Screen name="discussions/index" />
        </Stack>
        </AppShell>
      </SessionProvider>
    </ThemeProvider>
  );
}
