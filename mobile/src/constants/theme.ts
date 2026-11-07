/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;


/**
 * 영업중 공통 UI 색상
 * Figma HM-100의 색상. Expo 예제용 Colors/Spacing은 호환성을 위해 유지합니다.
 */
export const AppColors = {
  primary: '#0EA5E9',
  background: '#F5F7F9',
  surface: '#FFFFFF',
  text: '#172B3A',
  textSecondary: '#637381',
  border: '#E3E9EE',
} as const;

export const AppSpacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const AppRadius = { button: 12, card: 16 } as const;
export const AppLayout = { maxWidth: 600, touchTarget: 44, iconSize: 24 } as const;
export const AppTypography = {
  logo: { fontSize: 28, fontWeight: '800' },
  title: { fontSize: 24, lineHeight: 34, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 27, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 23, fontWeight: '400' },
  label: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 19, fontWeight: '400' },
  tab: { fontSize: 11, lineHeight: 18, fontWeight: '500' },
} as const;

export const AppSurfaces = {
  card: { backgroundColor: AppColors.surface, borderWidth: 1, borderColor: AppColors.border,
    borderRadius: AppRadius.card, padding: AppSpacing.lg, gap: AppSpacing.sm },
  button: { minHeight: 48, borderRadius: AppRadius.button, paddingHorizontal: AppSpacing.lg,
    borderWidth: 1, borderColor: AppColors.border, backgroundColor: AppColors.surface },
} as const;
