import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/ui/app-button';
import { AnonAvatar, displayName } from '@/components/ui/stance';
import { Icon } from '@/components/ui/icon';
import { AppColors, AppRadius, AppSpacing, AppSurfaces, AppTypography, StanceColors } from '@/constants/theme';
import { STANCE_LABEL } from '@/features/core/rules';
import type { OpinionCardData, Stance } from '@/types/core';

// 결과 화면 막대·흐름 차트용 입장 색. 의견 말풍선은 tint/text를 따로 쓴다.
export const STANCE_COLOR: Record<Stance, string> = { PRO: StanceColors.PRO.text, CON: StanceColors.CON.text, NEUTRAL: StanceColors.NEUTRAL.text };
type Props = {
  item: OpinionCardData;
  disabled?: boolean;
  canVote?: boolean;
  canPersuade?: boolean;
  onOpen?: () => void;
  onReply?: () => void;
  onVote?: (vote: 'UP' | 'DOWN') => void;
  onPersuaded?: () => void;
  repliesExpanded?: boolean;
  votePending?: boolean;
  countsUnavailable?: boolean;
};
export function OpinionCard({ item, disabled, canVote, canPersuade = canVote, onOpen, onReply, onVote, onPersuaded, repliesExpanded = false, votePending = false, countsUnavailable = false }: Props) {
  const [reportOpen, setReportOpen] = useState(false);
  const voteDisabled = !!disabled || !canVote || votePending;
  const persuadeDisabled = !!disabled || !canPersuade;
  // 원래의 투표 전환/취소 로직은 유지하고, 두 수의 차이를 현재 표수로 보여 줍니다.
  const score = item.upvotes - item.downvotes;
  // B안: 찬성은 왼쪽, 반대는 오른쪽 말풍선. 유보는 왼쪽 회색 말풍선.
  const right = item.stance === 'CON';
  const name = displayName(item.authorName);
  const tone = StanceColors[item.stance];
  return <View style={[styles.row, right && styles.rowRight]}>
   <AnonAvatar authorName={item.authorName} size={32} />
   <View style={[styles.column, right && styles.columnRight]}>
    <View style={[styles.header, right && styles.headerRight]}>
      <Text style={[styles.stance, { color: tone.text }]}>{STANCE_LABEL[item.stance]}</Text>
      <Text accessibilityLabel={`${name}, ${item.authorName}`} style={styles.meta}>{name}</Text>
      <Text style={styles.time}>{new Date(item.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
    </View>
    <View style={[styles.bubble, { backgroundColor: tone.tint }, right ? styles.bubbleRight : styles.bubbleLeft]}>
      <Text style={styles.body}>{item.content}</Text>
    </View>
    <View style={[styles.actions, right && styles.actionsRight]}>
      {!onVote && <View style={styles.upCount}><Icon name="up" size={14} color={AppColors.textSecondary} strokeWidth={2} />
        <Text accessibilityLabel={`공감 ${item.upvotes}`} style={styles.upText}>{item.upvotes}</Text></View>}
      {onVote && <View style={styles.votes}>
        <Pressable accessibilityRole="button" accessibilityLabel={countsUnavailable ? '공감 · 표수 확인 중' : `공감 · ${item.upvotes}개`} accessibilityState={{ disabled: voteDisabled, selected: item.myVote === 'UP', busy: votePending }}
          disabled={voteDisabled} onPress={() => onVote('UP')}
          style={({ pressed }) => [styles.vote, item.myVote === 'UP' && styles.selected, (pressed || voteDisabled) && styles.dim]}>
          <Text style={[styles.arrow, item.myVote === 'UP' && styles.selectedLabel]}>↑</Text>
        </Pressable>
        <Text accessibilityLabel={countsUnavailable ? '표수 확인 중' : `현재 표수 ${score}, 공감 ${item.upvotes}개, 비공감 ${item.downvotes}개`} accessibilityLiveRegion="polite" style={styles.score}>{countsUnavailable ? '…' : score}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={countsUnavailable ? '비공감 · 표수 확인 중' : `비공감 · ${item.downvotes}개`} accessibilityState={{ disabled: voteDisabled, selected: item.myVote === 'DOWN', busy: votePending }}
          disabled={voteDisabled} onPress={() => onVote('DOWN')}
          style={({ pressed }) => [styles.vote, item.myVote === 'DOWN' && styles.selected, (pressed || voteDisabled) && styles.dim]}>
          <Text style={[styles.arrow, item.myVote === 'DOWN' && styles.selectedLabel]}>↓</Text>
        </Pressable>
      </View>}
      <View style={styles.rightActions}>
        {onPersuaded && <Pressable accessibilityRole="button" accessibilityLabel="영업 · 이 의견에 설득됐어요" accessibilityState={{ disabled: persuadeDisabled }}
          disabled={persuadeDisabled} onPress={onPersuaded} style={({ pressed }) => [styles.action, (pressed || persuadeDisabled) && styles.dim]}>
          <Text style={styles.actionLabel}>영업</Text>
        </Pressable>}
        {(onOpen || onReply) && <Pressable accessibilityRole="button"
          accessibilityLabel={onOpen ? `답글 ${item.replyCount}개 ${repliesExpanded ? '접기' : '펼치기'}` : '이 의견에 답글 쓰기'}
          accessibilityState={onOpen ? { expanded: repliesExpanded } : { disabled: !!disabled }}
          disabled={!onOpen && disabled} onPress={onOpen ?? onReply}
          style={({ pressed }) => [styles.action, (pressed || (!onOpen && disabled)) && styles.dim]}>
          <Text style={styles.actionLabel}>{onOpen ? (repliesExpanded ? '답글 접기' : `답글 펼치기${item.replyCount ? ` ${item.replyCount}` : ''}`) : '답글 쓰기'}</Text>
        </Pressable>}
        <Pressable accessibilityRole="button" accessibilityLabel={`${item.authorName}의 의견 신고 안내`} hitSlop={6}
          onPress={() => setReportOpen(true)} style={({ pressed }) => [styles.report, pressed && styles.dim]}>
          <Text style={styles.reportLabel}>신고</Text>
        </Pressable>
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
   </View>
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: AppSpacing.sm },
  rowRight: { flexDirection: 'row-reverse' },
  column: { flex: 1, maxWidth: 460, gap: 6, alignItems: 'flex-start' },
  columnRight: { alignItems: 'flex-end' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerRight: { flexDirection: 'row-reverse' },
  stance: { ...AppTypography.caption, fontSize: 12, fontWeight: '700' },
  meta: { ...AppTypography.caption, fontSize: 12, fontWeight: '500', color: AppColors.textSecondary },
  time: { ...AppTypography.caption, fontSize: 12, color: AppColors.textFaint },
  bubble: { borderRadius: AppRadius.bubble, paddingHorizontal: 14, paddingVertical: 11, maxWidth: '92%' },
  bubbleLeft: { borderTopLeftRadius: 4 },
  bubbleRight: { borderTopRightRadius: 4 },
  body: { ...AppTypography.body, color: AppColors.text },
  report: { paddingHorizontal: 4, paddingVertical: 4 },
  reportLabel: { ...AppTypography.caption, fontSize: 11, color: AppColors.textFaint },
  actions: { flexDirection: 'row', alignItems: 'center', gap: AppSpacing.sm, flexWrap: 'wrap' },
  actionsRight: { flexDirection: 'row-reverse' },
  upCount: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  upText: { ...AppTypography.caption, fontSize: 12, fontWeight: '600', color: AppColors.textSecondary },
  votes: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  vote: { width: 32, minHeight: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  arrow: { ...AppTypography.label, fontSize: 16, color: AppColors.text },
  score: { fontSize: 13, fontWeight: '700', color: AppColors.text, minWidth: 22, textAlign: 'center', flexShrink: 1 },
  selected: { backgroundColor: AppColors.primary },
  selectedLabel: { color: AppColors.surface },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  action: { minHeight: 30, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { ...AppTypography.caption, fontSize: 12, fontWeight: '700', color: AppColors.text },
  dim: { opacity: 0.6 },
  backdrop: { flex: 1, backgroundColor: 'rgba(22, 24, 28, 0.35)', alignItems: 'center', justifyContent: 'center', padding: AppSpacing.xl },
  reportDialog: { ...AppSurfaces.card, width: '100%', maxWidth: 360, gap: AppSpacing.lg },
  dialogTitle: { ...AppTypography.heading, color: AppColors.text },
});
