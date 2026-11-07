import { StyleSheet, Text, View } from 'react-native';
import { AppColors, AppSpacing, AppTypography } from '@/constants/theme';

type Props = { remaining: string; title: string; description: string };

// Figma DB-200의 토론 주제 영역. 글꼴은 앱의 시스템 기본 글꼴을 유지합니다.
export function TopicSummaryCard({ remaining, title, description }: Props) {
  return <View style={styles.card}>
    <Text style={styles.remaining}>{remaining}</Text>
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#EAF7FD', padding: AppSpacing.lg, gap: AppSpacing.sm },
  remaining: { ...AppTypography.caption, color: AppColors.primary },
  title: { ...AppTypography.heading, color: AppColors.text },
  description: { ...AppTypography.caption, color: AppColors.textSecondary },
});
