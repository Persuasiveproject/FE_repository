import { router } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { StatusSign } from '@/components/ui/stance';
import { AppColors, AppSpacing, AppTypography, PanelSurface, StanceColors, WideLayout } from '@/constants/theme';
import { remainingTime , timeLeft } from '@/features/core/rules';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { useSession } from '@/features/session/session-provider';
import { withAuthRevision } from '@/services/basic-auth';
import { getHomeFeed } from '@/services/discussions';
import { gateway } from '@/services/gateway';
import type { Summary } from '@/types/core';
import type { Discussion } from '@/types/discussion';

// PC의 회색 바탕 위에 놓는 흰 패널. 제목 옆에 '더 보기' 같은 동작을 둘 수 있다.
export function SidePanel({ title, action, children }: { title: string; action?: { label: string; onPress: () => void }; children: ReactNode }) {
  return <View style={styles.panel}>
    <View style={styles.head}>
      <Text accessibilityRole="header" style={styles.panelTitle}>{title}</Text>
      {action && <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={6}><Text style={styles.action}>{action.label}</Text></Pressable>}
    </View>
    {children}
  </View>;
}

function openDiscussion(item: Discussion) {
  router.navigate({ pathname: '/discussions/[id]', params: { id: String(item.id) } });
}

// 패널 안의 짧은 토론 행. 순위는 서버가 준 순서 그대로 매긴다.
export function CompactDebateRow({ discussion, rank, extra }: { discussion: Discussion; rank?: number; extra?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={discussion.title} onPress={() => openDiscussion(discussion)}
    style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
    {rank !== undefined && <Text style={styles.rank}>{rank}</Text>}
    <View style={styles.rowBody}>
      <Text numberOfLines={2} style={styles.rowTitle}>{discussion.title}</Text>
      <StatusSign closed={discussion.status === 'CLOSED'} category={discussion.category} extra={[extra ?? `손님 ${discussion.participants}명`, extra ? null : timeLeft(discussion.endsAt)]} />
    </View>
  </Pressable>;
}

export function CompactDebateList({ items, ranked = false, empty, extra }: { items: Discussion[]; ranked?: boolean; empty: string; extra?: (item: Discussion) => string }) {
  if (items.length === 0) return <Text style={styles.empty}>{empty}</Text>;
  return <View>{items.slice(0, 5).map((item, index) =>
    <CompactDebateRow key={item.id} discussion={item} rank={ranked ? index + 1 : undefined} extra={extra?.(item)} />)}</View>;
}

// 홈 피드에서 마감 시각이 있는 문 연 토론을 마감이 가까운 순서로 고른다(서버 값만 사용).
export function closingSoon(items: Discussion[], now = Date.now()) {
  const seen = new Set<string>();
  return items.filter((item) => item.status !== 'CLOSED' && !!item.endsAt && Date.parse(item.endsAt) > now)
    .filter((item) => { const key = String(item.id); if (seen.has(key)) return false; seen.add(key); return true; })
    .sort((a, b) => Date.parse(a.endsAt!) - Date.parse(b.endsAt!));
}

export function ClosingSoonPanel({ items }: { items: Discussion[] }) {
  const list = closingSoon(items);
  if (list.length === 0) return null;
  return <SidePanel title="곧 문 닫는 토론">
    <CompactDebateList items={list} empty="" extra={(item) => remainingTime(item.endsAt ?? null).replace('마감까지 ', '') + ' 남음'} />
  </SidePanel>;
}

// 탐색 화면용: 홈 피드의 '손님 많은 토론' 상위 5개.
export function PopularPanel() {
  const { revision } = useSession();
  const loader = useCallback(() => withAuthRevision(revision, getHomeFeed), [revision]);
  const { resource } = useFocusResource(loader);
  return <View style={styles.fixed}><SidePanel title="지금 손님 많은 토론">
    {resource.status === 'success'
      ? <CompactDebateList ranked items={resource.data.popular} empty="아직 문 연 토론이 없어요." />
      : <Text style={styles.empty}>{resource.status === 'error' ? '불러오지 못했어요.' : '불러오는 중이에요.'}</Text>}
  </SidePanel></View>;
}

// 토론 만들기로 이끄는 카드.
export function CreatePanel() {
  return <View style={[styles.panel, styles.create]}>
    <Text style={[styles.panelTitle, styles.createTitle]}>내 생각으로 손님을 모아 보세요</Text>
    <Pressable accessibilityRole="button" onPress={() => router.navigate('/discussions/create')}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={styles.buttonText}>토론 열기</Text>
    </Pressable>
  </View>;
}

// 토론 상세 오른쪽: 마감까지 남은 시간과 기본 정보.
export function DebateInfoPanel({ remaining, rows }: { remaining: string; rows: [string, string][] }) {
  return <SidePanel title="토론 정보">
    <Text style={styles.big}>{remaining}</Text>
    {rows.map(([label, value]) => <View key={label} style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text>
    </View>)}
  </SidePanel>;
}

// 토론 상세 오른쪽: AI 요약 미리보기. 페이지를 옮기지 않고 대화를 읽으면서 볼 수 있다.
export function SummaryPreviewPanel({ debateId }: { debateId: string }) {
  const [summary, setSummary] = useState<Summary | null | 'error'>(null);
  useEffect(() => {
    let alive = true;
    gateway.getSummary(debateId).then((value) => { if (alive) setSummary(value); }, () => { if (alive) setSummary('error'); });
    return () => { alive = false; };
  }, [debateId]);
  const open = () => router.navigate({ pathname: '/discussions/[id]/summary', params: { id: debateId } });
  return <SidePanel title="AI가 정리한 양쪽 이야기" action={{ label: '근거 보기', onPress: open }}>
    {summary === null && <Text style={styles.empty}>불러오는 중이에요.</Text>}
    {summary === 'error' && <Text style={styles.empty}>요약을 불러오지 못했어요.</Text>}
    {summary && summary !== 'error' && summary.sections.length === 0 && <Text style={styles.empty}>아직 요약이 없어요.</Text>}
    {summary && summary !== 'error' && summary.sections.map((section) => {
      const stance = /반대/.test(section.title) ? 'CON' : /유보|중립/.test(section.title) ? 'NEUTRAL' : 'PRO';
      const lines = (section.items?.map((item) => item.text) ?? section.text.split('\n')).map((line) => line.replace(/^[-•]\s*/, '').trim()).filter(Boolean).slice(0, 3);
      return <View key={section.title} style={styles.sumBlock}>
        <Text style={[styles.sumTitle, { color: StanceColors[stance].text }]}>{{ PRO: '찬성 쪽은 이렇게 말해요', CON: '반대 쪽은 이렇게 말해요', NEUTRAL: '유보 쪽은 이렇게 말해요' }[stance]}</Text>
        {lines.map((line) => <View key={line} style={[styles.sumLine, { backgroundColor: StanceColors[stance].tint }]}>
          <Text style={styles.sumText}>{line}</Text>
        </View>)}
      </View>;
    })}
    {summary && summary !== 'error' && summary.sections.length > 0 && <Pressable accessibilityRole="button" onPress={open} style={styles.more}>
      <Icon name="spark" size={16} strokeWidth={1.6} /><Text style={styles.moreText}>바탕이 된 의견과 함께 보기</Text>
    </Pressable>}
  </SidePanel>;
}

const styles = StyleSheet.create({
  panel: { ...PanelSurface, gap: AppSpacing.sm, padding: 20 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: AppSpacing.sm },
  panelTitle: { ...AppTypography.heading, fontSize: 16, lineHeight: 22, color: AppColors.text },
  action: { ...AppTypography.caption, color: AppColors.textSecondary, fontWeight: '600' },
  row: { flexDirection: 'row', gap: AppSpacing.md, paddingVertical: AppSpacing.md, borderTopWidth: 1, borderTopColor: AppColors.border },
  rank: { ...AppTypography.heading, width: 18, color: AppColors.open },
  rowBody: { flex: 1, gap: 6 },
  rowTitle: { ...AppTypography.label, color: AppColors.text },
  empty: { ...AppTypography.caption, color: AppColors.textSecondary, paddingVertical: AppSpacing.xs },
  create: { backgroundColor: AppColors.text },
  createTitle: { color: AppColors.surface },
  body: { ...AppTypography.caption, fontSize: 14, lineHeight: 21, color: '#C9CDD4' },
  button: { marginTop: AppSpacing.xs, minHeight: 44, borderRadius: 999, backgroundColor: AppColors.surface, alignItems: 'center', justifyContent: 'center' },
  buttonText: { ...AppTypography.label, color: AppColors.text },
  big: { ...AppTypography.title, fontSize: 22, color: AppColors.text },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: AppColors.border },
  infoLabel: { ...AppTypography.caption, fontSize: 14, color: AppColors.textSecondary },
  infoValue: { ...AppTypography.caption, fontSize: 14, color: AppColors.text, fontWeight: '600' },
  sumBlock: { gap: 6, paddingTop: 4 },
  sumTitle: { ...AppTypography.caption, fontWeight: '700' },
  sumLine: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  sumText: { ...AppTypography.caption, fontSize: 14, lineHeight: 20, color: AppColors.text },
  more: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
  moreText: { ...AppTypography.caption, color: AppColors.textSecondary, fontWeight: '600' },
  fixed: { width: WideLayout.panelWidth },
  pressed: { opacity: 0.6 },
});
