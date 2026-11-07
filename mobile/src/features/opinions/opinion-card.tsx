import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/ui/app-button';
import { Caption } from '@/components/ui/content-blocks';
import { AppColors, AppSpacing, AppSurfaces, AppTypography } from '@/constants/theme';
import { STANCE_LABEL } from '@/features/core/rules';
import type { Opinion, Stance } from '@/types/core';

export const STANCE_COLOR: Record<Stance, string> = { PRO: '#3B82F6', CON: '#CB642B', NEUTRAL: '#7A8599' };
type Props = {
  item: Opinion;
  disabled?: boolean;
  canVote?: boolean;
  onOpen?: () => void;
  onReply?: () => void;
  onVote?: (vote: 'UP' | 'DOWN') => void;
  onPersuaded?: () => void;
  repliesExpanded?: boolean;
};
export function OpinionCard({ item, disabled, canVote, onOpen, onReply, onVote, onPersuaded, repliesExpanded = false }: Props) {
  const [reportOpen, setReportOpen] = useState(false);
  const voteDisabled = !!disabled || !canVote;
  // 원래의 투표 전환/취소 로직은 유지하고, 두 수의 차이를 현재 표수로 보여 줍니다.
  const score = item.upvotes - item.downvotes;
  return <View style={[styles.card, { borderColor: STANCE_COLOR[item.stance] }]}>
    <View style={styles.header}>
      <Text style={[styles.meta, { color: STANCE_COLOR[item.stance] }]}>{item.authorName} · {STANCE_LABEL[item.stance]}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${item.authorName}의 의견 신고 안내`} hitSlop={6}
        onPress={() => setReportOpen(true)} style={({ pressed }) => [styles.report, pressed && styles.dim]}>
        <Text style={styles.reportLabel}>신고</Text>
      </Pressable>
    </View>
    <Text style={styles.body}>{item.content}</Text>
    <Caption>{new Date(item.createdAt).toLocaleString('ko-KR')}</Caption>
    <View style={styles.actions}>
      {onVote && <View style={styles.votes}>
        <Pressable accessibilityRole="button" accessibilityLabel="업보트" accessibilityState={{ disabled: voteDisabled, selected: item.myVote === 'UP' }}
          disabled={voteDisabled} onPress={() => onVote('UP')}
          style={({ pressed }) => [styles.vote, item.myVote === 'UP' && styles.selected, (pressed || voteDisabled) && styles.dim]}>
          <Text style={[styles.arrow, item.myVote === 'UP' && styles.selectedLabel]}>↑</Text>
        </Pressable>
        <Text accessibilityLabel={`현재 표수 ${score}`} accessibilityLiveRegion="polite" style={styles.score}>{score}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="다운보트" accessibilityState={{ disabled: voteDisabled, selected: item.myVote === 'DOWN' }}
          disabled={voteDisabled} onPress={() => onVote('DOWN')}
          style={({ pressed }) => [styles.vote, item.myVote === 'DOWN' && styles.selected, (pressed || voteDisabled) && styles.dim]}>
          <Text style={[styles.arrow, item.myVote === 'DOWN' && styles.selectedLabel]}>↓</Text>
        </Pressable>
      </View>}
      <View style={styles.rightActions}>
        {onPersuaded && <Pressable accessibilityRole="button" accessibilityLabel="영업 · 이 의견에 설득됐어요" accessibilityState={{ disabled: voteDisabled }}
          disabled={voteDisabled} onPress={onPersuaded} style={({ pressed }) => [styles.action, (pressed || voteDisabled) && styles.dim]}>
          <Text style={styles.actionLabel}>영업</Text>
        </Pressable>}
        {(onOpen || onReply) && <Pressable accessibilityRole="button"
          accessibilityLabel={onOpen ? `답글 ${item.replyCount}개 ${repliesExpanded ? '접기' : '펼치기'}` : '이 의견에 답글 쓰기'}
          accessibilityState={onOpen ? { expanded: repliesExpanded } : { disabled: !!disabled }}
          disabled={!onOpen && disabled} onPress={onOpen ?? onReply}
          style={({ pressed }) => [styles.action, (pressed || (!onOpen && disabled)) && styles.dim]}>
          <Text style={styles.actionLabel}>{onOpen ? (repliesExpanded ? '답글 접기' : '답글 펼치기') : '답글 쓰기'}</Text>
        </Pressable>}
      </View>
    </View>
    <Modal visible={reportOpen} transparent animationType="fade" onRequestClose={() => setReportOpen(false)}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.reportDialog}>
          <Text accessibilityRole="header" style={styles.dialogTitle}>의견 신고 안내</Text>
          <Text style={styles.body}>신고 기능은 서버 연결 준비 중입니다. 현재 이 버튼으로 실제 신고가 접수되지는 않습니다.</Text>
          <AppButton label="닫기" onPress={() => setReportOpen(false)} />
        </View>
      </View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  card: { ...AppSurfaces.card, gap: AppSpacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: AppSpacing.sm },
  meta: { ...AppTypography.caption, flex: 1 },
  body: { ...AppTypography.body, color: AppColors.text },
  report: { paddingHorizontal: 4, paddingVertical: 4 },
  reportLabel: { ...AppTypography.caption, fontSize: 11, color: AppColors.textSecondary },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  votes: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  vote: { width: 32, minHeight: 44, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  arrow: { ...AppTypography.label, fontSize: 18, color: AppColors.text },
  score: { fontSize: 14, fontWeight: '700', color: AppColors.text, minWidth: 24, textAlign: 'center', flexShrink: 1 },
  selected: { backgroundColor: AppColors.primary },
  selectedLabel: { color: AppColors.surface },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' },
  action: { minHeight: 32, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: AppColors.border,
    borderRadius: 8, backgroundColor: AppColors.surface, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { ...AppTypography.caption, fontWeight: '500', color: AppColors.text },
  dim: { opacity: 0.65 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.35)', alignItems: 'center', justifyContent: 'center', padding: AppSpacing.xl },
  reportDialog: { ...AppSurfaces.card, width: '100%', maxWidth: 360, gap: AppSpacing.lg },
  dialogTitle: { ...AppTypography.heading, color: AppColors.text },
});
