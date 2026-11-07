import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppColors, AppSpacing, AppTypography } from '@/constants/theme';
import { AppButton } from '@/components/ui/app-button';

type Props = { kind: 'loading' | 'error' | 'empty'; message?: string; onRetry?: () => void };
export function ResourceState({ kind, message, onRetry }: Props) {
  const text = message ?? { loading: '토론을 불러오는 중이에요', error: '토론을 불러오지 못했어요', empty: '해당하는 토론이 없습니다.' }[kind];
  return <View style={styles.container} accessibilityLiveRegion="polite">
    {kind === 'loading' && <ActivityIndicator color={AppColors.primary} accessibilityLabel="로딩 중" />}
    <Text style={styles.text}>{text}</Text>
    {kind === 'error' && onRetry && <AppButton label="다시 시도" onPress={onRetry} />}
  </View>;
}
const styles = StyleSheet.create({
  container: { paddingVertical: AppSpacing.xl, gap: AppSpacing.lg },
  text: { ...AppTypography.body, color: AppColors.textSecondary, textAlign: 'center' },
});
