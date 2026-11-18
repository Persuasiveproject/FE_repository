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
 * 영업중 공통 UI 색상 (Figma 「영업중 UI 리디자인」 B안)
 * 색에는 뜻을 하나씩만 준다: 찬성 = 파랑 계열, 반대 = 붉은 계열, 유보 = 회색, 진행 중 = 초록.
 * 넓은 면에는 원색 대신 tint, 막대에는 bar, 글자에는 진한 색을 쓴다.
 * Expo 예제용 Colors/Spacing은 호환성을 위해 유지합니다.
 */
export const AppColors = {
  primary: '#16181C',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  soft: '#F4F5F7',
  text: '#16181C',
  textSecondary: '#6F7682',
  textFaint: '#A6ACB5',
  border: '#ECEEF1',
  open: '#12B76A',
  danger: '#B42318',
} as const;

export const StanceColors = {
  PRO: { text: '#4A65C0', bar: '#9DAEE0', tint: '#EDF0FA' },
  CON: { text: '#C95A52', bar: '#E6A9A3', tint: '#FAEEEC' },
  NEUTRAL: { text: '#7C828C', bar: '#D3D6DB', tint: '#F4F5F7' },
} as const;

export const AppSpacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 } as const;
export const AppRadius = { button: 999, card: 20, bubble: 18, field: 16 } as const;
export const AppLayout = { maxWidth: 600, touchTarget: 44, iconSize: 24 } as const;
export const AppTypography = {
  logo: { fontSize: 24, lineHeight: 30, fontWeight: '900', letterSpacing: -0.6 },
  display: { fontSize: 26, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6 },
  title: { fontSize: 23, lineHeight: 31, fontWeight: '700', letterSpacing: -0.5 },
  number: { fontSize: 30, lineHeight: 34, fontWeight: '900', letterSpacing: -0.6 },
  heading: { fontSize: 18, lineHeight: 26, fontWeight: '700', letterSpacing: -0.3 },
  rowTitle: { fontSize: 17, lineHeight: 25, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 23, fontWeight: '400' },
  label: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 19, fontWeight: '400' },
  tab: { fontSize: 11, lineHeight: 16, fontWeight: '500' },
} as const;

export const AppSurfaces = {
  card: { backgroundColor: AppColors.surface, borderWidth: 1.5, borderColor: AppColors.border,
    borderRadius: AppRadius.card, padding: AppSpacing.lg, gap: AppSpacing.sm },
  button: { minHeight: 48, borderRadius: AppRadius.button, paddingHorizontal: AppSpacing.xl,
    borderWidth: 1.5, borderColor: AppColors.border, backgroundColor: AppColors.surface },
} as const;
