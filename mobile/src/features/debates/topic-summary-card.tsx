import { StyleSheet, Text, View } from 'react-native';
import { StatusSign } from '@/components/ui/stance';
import { AppColors, AppSpacing, AppTypography } from '@/constants/theme';

type Props = { remaining: string; title: string; description: string; closed?: boolean; category?: string; kind?: string };

// B안 토론 머리: 상태 간판(영업중/문 닫음) + 큰 제목 + 설명. 배경색 박스를 쓰지 않는다.
export function TopicSummaryCard({ remaining, title, description, closed, category, kind }: Props) {
  return <View style={styles.head}>
    <StatusSign closed={closed} extra={[category, kind, remaining]} />
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    {!!description && <Text style={styles.description}>{description}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  head: { gap: AppSpacing.sm, paddingBottom: AppSpacing.xs },
  title: { ...AppTypography.title, fontSize: 24, lineHeight: 33, color: AppColors.text },
  description: { ...AppTypography.body, lineHeight: 24, color: AppColors.textSecondary },
});
