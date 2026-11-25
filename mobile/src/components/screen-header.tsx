import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppColors, AppLayout, AppSpacing, AppTypography } from '@/constants/theme';
import { useWide } from '@/hooks/use-wide';

type Props = { title: string; back?: boolean; brand?: boolean; right?: ReactNode };

// 헤더: 홈은 오른쪽 버튼만, 하위 화면은 뒤로 가기 + 가운데 제목.
export function ScreenHeader({ title, back = false, brand = false, right }: Props) {
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }
  const wide = useWide();
  return (
    <View style={[styles.header, wide && styles.headerWide]}>
      {back && <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" onPress={goBack} hitSlop={8} style={styles.side}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>}
      {brand ? <View style={styles.brandRow} /> : <Text accessibilityRole="header" numberOfLines={1} style={[styles.title, back && styles.centered]}>{title}</Text>}
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
  // 넓은 화면에서는 회색 바탕 위에 바로 놓는다.
  headerWide: { backgroundColor: 'transparent', paddingHorizontal: 0, minHeight: 64 },
  side: { minWidth: AppLayout.touchTarget, minHeight: AppLayout.touchTarget, alignItems: 'center', justifyContent: 'center' },
  backText: { color: AppColors.text, fontSize: 32, lineHeight: 34 },
});
