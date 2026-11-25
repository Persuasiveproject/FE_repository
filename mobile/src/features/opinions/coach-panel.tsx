import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/ui/app-button';
import { Icon } from '@/components/ui/icon';
import { AppColors, AppSpacing, AppTypography, StanceColors } from '@/constants/theme';
import type { CoachReason, CoachResult, Stance } from '@/types/core';

const REASON_TEXT: Record<CoachReason, string> = {
  ATTACK: '주장이 아니라 사람을 향한 표현이 있어요.',
  MOCKING: '비꼬는 말투로 읽힐 수 있어요.',
  GENERALIZING: '반대쪽 사람 전체를 한데 묶어 말하고 있어요.',
  HOSTILE: '날 선 말투로 읽힐 수 있어요.',
};

type Props = {
  original: string; result: CoachResult; stance: Stance; pending: boolean;
  onUseSuggestion: () => void; onEdit: () => void; onKeepOriginal: () => void;
};

// 올리기 전 작성 코치 제안. 받아들이기, 고쳐 쓰기, 그대로 올리기 중 고른다(Argyle et al., PNAS 2023의 방식).
export function CoachPanel({ original, result, stance, pending, onUseSuggestion, onEdit, onKeepOriginal }: Props) {
  const colors = StanceColors[stance];
  return <View style={styles.panel} accessibilityLiveRegion="polite">
    <View style={styles.head}>
      <Icon name="spark" size={18} strokeWidth={1.6} />
      <Text accessibilityRole="header" style={styles.title}>이렇게 바꿔 올려 볼까요?</Text>
    </View>
    {result.reasons.map((reason) => <Text key={reason} style={styles.reason}>{REASON_TEXT[reason]}</Text>)}
    <View style={styles.block}>
      <Text style={styles.label}>내 글</Text>
      <Text style={styles.original}>{original.trim()}</Text>
    </View>
    <View style={[styles.block, styles.suggestion, { borderColor: colors.text, backgroundColor: colors.tint }]}>
      <Text style={[styles.label, { color: colors.text }]}>바꿔 본 글</Text>
      <Text style={styles.suggestionText}>{result.suggestion}</Text>
    </View>
    <AppButton label="바꾼 글로 올리기" variant="primary" loading={pending} disabled={pending} onPress={onUseSuggestion} />
    <View style={styles.row}>
      <Pressable accessibilityRole="button" disabled={pending} onPress={onEdit} style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
        <Text style={styles.linkText}>바꾼 글을 고쳐 쓰기</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={pending} onPress={onKeepOriginal} style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
        <Text style={styles.linkText}>내 글 그대로 올리기</Text>
      </Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  panel: { gap: AppSpacing.sm, padding: 18, borderRadius: 20, backgroundColor: AppColors.soft },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { ...AppTypography.heading, fontSize: 17, lineHeight: 24, color: AppColors.text },
  reason: { ...AppTypography.caption, fontSize: 14, color: AppColors.text },
  block: { gap: 4, paddingTop: AppSpacing.xs },
  label: { ...AppTypography.caption, fontSize: 12, fontWeight: '700', color: AppColors.textSecondary },
  original: { ...AppTypography.caption, fontSize: 14, lineHeight: 21, color: AppColors.textSecondary },
  suggestion: { padding: 14, borderRadius: 14, borderWidth: 1 },
  suggestionText: { ...AppTypography.caption, fontSize: 15, lineHeight: 22, color: AppColors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: AppSpacing.sm },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  linkText: { ...AppTypography.caption, fontSize: 14, fontWeight: '600', color: AppColors.text, textDecorationLine: 'underline' },
  pressed: { opacity: 0.6 },
});
