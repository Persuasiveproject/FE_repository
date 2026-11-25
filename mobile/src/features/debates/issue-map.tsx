import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SidePanel } from '@/components/side-panel';
import { Icon } from '@/components/ui/icon';
import { AppColors, AppSpacing, AppTypography, StanceColors } from '@/constants/theme';
import { gateway } from '@/services/gateway';
import type { Issue, IssueMap, Stance } from '@/types/core';

const SIDE_LABEL = { PRO: '찬성', CON: '반대' } as const;

function ago(iso: string | null) {
  if (!iso) return '';
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}시간 전` : `${Math.round(hours / 24)}일 전`;
}

function useIssues(debateId: string) {
  const [map, setMap] = useState<IssueMap | null | 'error'>(() => gateway.getIssues ? null : { createdAt: null, issues: [] });
  useEffect(() => {
    let alive = true;
    if (!gateway.getIssues) return;
    gateway.getIssues(debateId).then((value) => { if (alive) setMap(value); }, () => { if (alive) setMap('error'); });
    return () => { alive = false; };
  }, [debateId]);
  return map;
}

function openThread(debateId: string, opinionId: string) {
  router.navigate({ pathname: '/discussions/[id]/threads/[opinionId]', params: { id: debateId, opinionId } });
}

type Props = { debateId: string; myStance?: Stance | null };

// 토론 중 쟁점 정리. 찬반이 무엇을 두고 갈리는지 보여 주고, 한쪽만 이야기한 쟁점은 '답 기다림'으로 표시한다.
// 휴대폰: 의견 목록 위 카드. 정리가 아직 없으면 아무것도 그리지 않는다.
export function IssueMapCard({ debateId, myStance }: Props) {
  const map = useIssues(debateId);
  if (!map || map === 'error' || map.issues.length === 0) return null;
  return <View style={styles.card}>
    <Header createdAt={map.createdAt} />
    <IssueList debateId={debateId} issues={map.issues} myStance={myStance} />
  </View>;
}

// PC 오른쪽 패널.
export function IssueMapPanel({ debateId, myStance }: Props) {
  const map = useIssues(debateId);
  return <SidePanel title="지금 갈리는 쟁점">
    {map === null && <Text style={styles.empty}>불러오는 중이에요.</Text>}
    {map === 'error' && <Text style={styles.empty}>쟁점을 불러오지 못했어요.</Text>}
    {map && map !== 'error' && map.issues.length === 0 && <Text style={styles.empty}>아직 정리된 쟁점이 없어요.</Text>}
    {map && map !== 'error' && map.issues.length > 0 && <>
      {!!map.createdAt && <Text style={styles.meta}>{ago(map.createdAt)} 정리</Text>}
      <IssueList debateId={debateId} issues={map.issues} myStance={myStance} />
    </>}
  </SidePanel>;
}

function Header({ createdAt }: { createdAt: string | null }) {
  return <View style={styles.head}>
    <Icon name="spark" size={18} strokeWidth={1.6} />
    <Text accessibilityRole="header" style={styles.title}>지금 갈리는 쟁점</Text>
    {!!createdAt && <Text style={styles.meta}>{ago(createdAt)} 정리</Text>}
  </View>;
}

function IssueList({ debateId, issues, myStance }: { debateId: string; issues: Issue[]; myStance?: Stance | null }) {
  return <View style={styles.list}>
    {issues.map((issue) => <View key={issue.title} style={styles.issue}>
      <View style={styles.issueHead}>
        <Text style={styles.issueTitle}>{issue.title}</Text>
        {issue.awaiting && <Text style={styles.waiting}>{SIDE_LABEL[issue.awaiting]} 답 기다림</Text>}
      </View>
      {(['PRO', 'CON'] as const).map((side) => {
        const entry = side === 'PRO' ? issue.pro : issue.con;
        const colors = StanceColors[side];
        if (entry) {
          return <Pressable key={side} accessibilityRole="button" accessibilityLabel={`${SIDE_LABEL[side]} 근거 의견 보기`}
            onPress={() => openThread(debateId, entry.opinionIds[0])}
            style={({ pressed }) => [styles.side, { backgroundColor: colors.tint }, pressed && styles.pressed]}>
            <Text style={[styles.sideLabel, { color: colors.text }]}>{SIDE_LABEL[side]}</Text>
            <Text style={styles.sideText}>{entry.text}</Text>
          </Pressable>;
        }
        // 이 쪽은 아직 답하지 않았다. 내가 이 쪽이면 상대 근거 의견에 바로 반박을 남길 수 있다.
        const other = side === 'PRO' ? issue.con : issue.pro;
        const canAnswer = myStance === side && !!other;
        return <View key={side} style={styles.gap}>
          <Text style={[styles.sideLabel, { color: colors.text }]}>{SIDE_LABEL[side]}</Text>
          <Text style={styles.gapText}>아직 이 쟁점에 답한 {SIDE_LABEL[side]} 의견이 없어요.</Text>
          {canAnswer && <Pressable accessibilityRole="button" hitSlop={6}
            onPress={() => router.navigate({ pathname: '/discussions/[id]/reply/[opinionId]', params: { id: debateId, opinionId: other!.opinionIds[0] } })}
            style={({ pressed }) => [styles.answer, pressed && styles.pressed]}>
            <Text style={styles.answerText}>반박 남기기</Text><Icon name="right" size={14} />
          </Pressable>}
        </View>;
      })}
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  card: { gap: AppSpacing.md, padding: 18, borderRadius: 20, borderWidth: 1, borderColor: AppColors.border, backgroundColor: AppColors.surface },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { ...AppTypography.heading, fontSize: 16, lineHeight: 22, color: AppColors.text, flex: 1 },
  meta: { ...AppTypography.caption, fontSize: 12, color: AppColors.textSecondary },
  empty: { ...AppTypography.caption, color: AppColors.textSecondary, paddingVertical: AppSpacing.xs },
  list: { gap: AppSpacing.lg },
  issue: { gap: 6 },
  issueHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: AppSpacing.sm },
  issueTitle: { ...AppTypography.label, fontSize: 15, fontWeight: '700', color: AppColors.text, flexShrink: 1 },
  waiting: { ...AppTypography.caption, fontSize: 12, fontWeight: '600', color: AppColors.text, backgroundColor: AppColors.soft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  side: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  sideLabel: { ...AppTypography.caption, fontSize: 13, fontWeight: '700', width: 28 },
  sideText: { ...AppTypography.caption, fontSize: 14, lineHeight: 20, color: AppColors.text, flex: 1 },
  gap: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: AppColors.border },
  gapText: { ...AppTypography.caption, fontSize: 14, lineHeight: 20, color: AppColors.textSecondary, flex: 1 },
  answer: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  answerText: { ...AppTypography.caption, fontSize: 13, fontWeight: '700', color: AppColors.text },
  pressed: { opacity: 0.7 },
});
