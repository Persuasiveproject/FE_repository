import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppColors, AppLayout, AppSpacing, AppTypography } from '@/constants/theme';

export function ScreenHeader({ title, back = false }: { title: string; back?: boolean }) {
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }
  return (
    <View style={styles.header}>
      {back && <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" onPress={goBack} style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>}
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  header: { backgroundColor: AppColors.surface, padding: AppSpacing.md, flexDirection: 'row',
    alignItems: 'center', gap: AppSpacing.sm },
  title: { ...AppTypography.heading, color: AppColors.text, flex: 1 },
  back: { minWidth: AppLayout.touchTarget, minHeight: AppLayout.touchTarget,
    alignItems: 'center', justifyContent: 'center' },
  backText: { color: AppColors.text, fontSize: 28 },
});
