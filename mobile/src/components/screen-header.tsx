import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppColors, AppLayout, AppSpacing, AppTypography } from '@/constants/theme';

type Props = { title: string; back?: boolean; brand?: boolean; right?: ReactNode };

// B안 헤더: 로고는 초록 점 + '영업중', 하위 화면은 뒤로 가기 + 가운데 제목.
export function ScreenHeader({ title, back = false, brand = false, right }: Props) {
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }
  return (
    <View style={styles.header}>
      {back && <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" onPress={goBack} hitSlop={8} style={styles.side}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>}
      {brand ? <View style={styles.brandRow}>
        <View style={styles.brandDot} />
        <Text accessibilityRole="header" style={styles.brand}>{title}</Text>
      </View> : <Text accessibilityRole="header" numberOfLines={1} style={[styles.title, back && styles.centered]}>{title}</Text>}
      {right ?? (back ? <View style={styles.side} /> : null)}
    </View>
  );
}
const styles = StyleSheet.create({
  header: { backgroundColor: AppColors.surface, paddingHorizontal: AppSpacing.lg, minHeight: 52,
    flexDirection: 'row', alignItems: 'center', gap: AppSpacing.sm },
  title: { ...AppTypography.display, color: AppColors.text, flex: 1, paddingHorizontal: AppSpacing.xs },
  centered: { ...AppTypography.label, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  brandRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: AppSpacing.xs },
  brandDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: AppColors.open, boxShadow: '0 0 8px rgba(18, 183, 106, 0.55)' },
  brand: { ...AppTypography.logo, color: AppColors.text },
  side: { minWidth: AppLayout.touchTarget, minHeight: AppLayout.touchTarget, alignItems: 'center', justifyContent: 'center' },
  backText: { color: AppColors.text, fontSize: 32, lineHeight: 34 },
});
