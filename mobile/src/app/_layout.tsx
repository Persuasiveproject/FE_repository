import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts([
    { fontFamily: 'NotoSansKR', fontDefinitions: [
      { path: require('@/assets/fonts/NotoSansKR.ttf'), weight: '100 900' },
    ] },
  ]);
  // 글꼴 오류가 나도 화면이 계속 표시되도록 시스템 글꼴로 진행합니다.
  if (!fontsLoaded && !fontError) return null;
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="discussions/[id]" />
        <Stack.Screen name="discussions/create" />
        <Stack.Screen name="discussions/index" />
      </Stack>
    </ThemeProvider>
  );
}
