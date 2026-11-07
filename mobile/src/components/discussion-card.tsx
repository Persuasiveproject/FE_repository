import { AppColors } from '@/constants/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// 토론 데이터의 형태 정의
export type Discussion = {
  id: number;
  category: string;
  title: string;
  description: string;
  participants: number;
};

// 컴포넌트가 외부에서 받을 정보
type Props = {
  discussion: Discussion;
  onPress: () => void;
};

// 실제 토론 카드
export function DiscussionCard({ discussion, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardTop}>
        <Text style={styles.tag}>{discussion.category}</Text>
        <Text style={styles.status}>진행 중</Text>
      </View>

      <Text style={styles.title}>{discussion.title}</Text>

      <Text style={styles.description}>
        {discussion.description}
      </Text>

      <Text style={styles.participants}>
        참여 {discussion.participants}명
      </Text>
    </Pressable>
  );
}

// 토론 카드 전용 스타일
const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.surface,
    padding: 18,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tag: {
    color: AppColors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  status: {
    color: AppColors.textSecondary,
    fontSize: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginBottom: 14,
  },
  participants: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
});

