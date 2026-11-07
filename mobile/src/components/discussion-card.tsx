import { AppColors, AppSurfaces, AppTypography } from '@/constants/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// 토론 데이터의 형태 정의
import type { Discussion } from '@/types/discussion';
export type { Discussion } from '@/types/discussion';

// 컴포넌트가 외부에서 받을 정보
type Props = {
  discussion: Discussion;
  onPress: () => void;
  recommended?: boolean;
};

// 실제 토론 카드
export function DiscussionCard({ discussion, onPress, recommended = false }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={discussion.title}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.cardTop}>
        <Text style={styles.tag}>{[recommended ? '추천' : null, discussion.category,
          !recommended ? discussion.kind : null, discussion.status === 'CLOSED' ? '종료' : '진행 중'].filter(Boolean).join(' · ')}</Text>
      </View>

      <Text style={styles.title}>{discussion.title}</Text>

      <Text style={styles.description}>
        {discussion.description}
      </Text>

      <Text style={styles.participants}>
        참여 {discussion.participants}명{discussion.opinionCount !== undefined ? `   의견 ${discussion.opinionCount}개` : ''}
      </Text>
    </Pressable>
  );
}

// 토론 카드 전용 스타일
const styles = StyleSheet.create({
  card: {
    ...AppSurfaces.card,
  },
  cardTop: {
    alignSelf: 'stretch',
  },
  tag: {
    color: AppColors.primary,
    ...AppTypography.caption,
  },
  title: {
    ...AppTypography.heading,
    color: AppColors.text,
  },
  description: {
    ...AppTypography.body,
    color: AppColors.textSecondary,
  },
  participants: {
    ...AppTypography.caption,
    color: AppColors.textSecondary,
  },
  pressed: { opacity: 0.65 },
});

