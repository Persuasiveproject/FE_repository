import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppColors, AppSpacing, AppTypography } from '@/constants/theme';
import { StatusSign } from '@/components/ui/stance';

import type { Discussion } from '@/types/discussion';
import { timeLeft } from '@/features/core/rules';
export type { Discussion } from '@/types/discussion';

type Props = {
  discussion: Discussion;
  onPress: () => void;
  recommended?: boolean;
  // 주면 카테고리가 누를 수 있는 칩이 되어, 그 카테고리 토론만 걸러 보게 한다.
  onCategoryPress?: () => void;
};

// B안 목록 행: 카드를 반복하지 않고 아래 구분선으로 나눈다.
export function DiscussionCard({ discussion, onPress, recommended = false, onCategoryPress }: Props) {
  const closed = discussion.status === 'CLOSED';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={discussion.title}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      <StatusSign closed={closed} category={discussion.category} onCategoryPress={onCategoryPress}
        extra={[discussion.kind, closed ? null : timeLeft(discussion.endsAt), recommended ? '추천' : null]} />
      <Text style={styles.title}>{discussion.title}</Text>
      {!!discussion.description && <Text numberOfLines={2} style={styles.description}>{discussion.description}</Text>}
      <View style={styles.meta}>
        <Text style={styles.metaText}>손님 {discussion.participants}명</Text>
        {discussion.opinionCount !== undefined && <Text style={styles.metaText}>의견 {discussion.opinionCount}개</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: AppSpacing.lg, gap: AppSpacing.sm, borderBottomWidth: 1, borderBottomColor: AppColors.border },
  title: { ...AppTypography.rowTitle, color: AppColors.text },
  description: { ...AppTypography.body, fontSize: 14, color: AppColors.textSecondary },
  meta: { flexDirection: 'row', gap: AppSpacing.md },
  metaText: { ...AppTypography.caption, color: AppColors.textSecondary, fontWeight: '500' },
  pressed: { opacity: 0.6 },
});
