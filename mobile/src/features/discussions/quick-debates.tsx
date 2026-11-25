import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SidePanel } from '@/components/side-panel';
import { AppColors, AppSpacing, AppTypography } from '@/constants/theme';
import type { Discussion } from '@/types/discussion';
import { CategoryChip } from '@/components/ui/category-chip';

// 간단토론은 5~15분이면 끝나서 '남은 시간'이 가장 중요한 정보다. 30초마다 다시 계산하고, 끝난 토론은 목록에서 뺀다.
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), intervalMs); return () => clearInterval(timer); }, [intervalMs]);
  return now;
}

export function minutesLeft(endsAt: string | null | undefined, now: number) {
  if (!endsAt) return null;
  const ms = Date.parse(endsAt) - now;
  return ms > 0 ? Math.ceil(ms / 60_000) : 0;
}

function open(item: Discussion) {
  router.navigate({ pathname: '/discussions/[id]', params: { id: String(item.id) } });
}

export function QuickDebateCard({ discussion, now }: { discussion: Discussion; now: number }) {
  const left = minutesLeft(discussion.endsAt, now) ?? 0;
  const urgent = left <= 3;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${discussion.title}, ${left}분 남음`} onPress={() => open(discussion)}
    style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
    <View style={[styles.timer, urgent && styles.timerUrgent]}>
      <Text style={[styles.timerValue, urgent && styles.timerValueUrgent]}>{left}</Text>
      <Text style={[styles.timerUnit, urgent && styles.timerValueUrgent]}>분 남음</Text>
    </View>
    <View style={styles.body}>
      <Text numberOfLines={2} style={styles.title}>{discussion.title}</Text>
      <View style={styles.metaRow}><CategoryChip name={discussion.category} /><Text style={styles.meta}>손님 {discussion.participants}명</Text></View>
    </View>
  </Pressable>;
}

export function QuickDebateList({ items, empty = 'full' }: { items: Discussion[]; empty?: 'full' | 'compact' }) {
  const now = useNow();
  const live = items.filter((item) => (minutesLeft(item.endsAt, now) ?? 0) > 0);
  if (live.length === 0) return <View style={empty === 'full' ? styles.empty : styles.emptyCompact}>
    {empty === 'full' && <Text style={styles.emptyTitle}>지금 열린 간단토론이 없어요</Text>}
    {empty === 'compact' && <Text style={styles.emptyBody}>지금 열린 간단토론이 없어요.</Text>}
    <Pressable accessibilityRole="button" onPress={() => router.navigate('/discussions/create')} style={styles.emptyButton}>
      <Text style={styles.emptyButtonText}>간단토론 열기</Text>
    </Pressable>
  </View>;
  return <View style={styles.list}>{live.map((item) => <QuickDebateCard key={item.id} discussion={item} now={now} />)}</View>;
}

// PC 홈 오른쪽 패널
export function QuickPanel({ items }: { items: Discussion[] | null }) {
  return <SidePanel title="지금 열린 간단토론">
    {items ? <QuickDebateList items={items.slice(0, 5)} empty="compact" /> : <Text style={styles.emptyBody}>불러오는 중이에요.</Text>}
  </SidePanel>;
}

const styles = StyleSheet.create({
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  list: { gap: AppSpacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: AppSpacing.md, paddingVertical: AppSpacing.md, borderBottomWidth: 1, borderBottomColor: AppColors.border },
  timer: { width: 58, height: 58, borderRadius: 16, backgroundColor: AppColors.soft, alignItems: 'center', justifyContent: 'center' },
  timerUrgent: { backgroundColor: '#FDECEA' },
  timerValue: { fontSize: 22, lineHeight: 26, fontWeight: '800', color: AppColors.text },
  timerUnit: { fontSize: 11, lineHeight: 14, fontWeight: '600', color: AppColors.textSecondary },
  timerValueUrgent: { color: AppColors.danger },
  body: { flex: 1, gap: 4 },
  title: { ...AppTypography.label, fontSize: 16, lineHeight: 22, color: AppColors.text },
  meta: { ...AppTypography.caption, color: AppColors.textSecondary },
  empty: { paddingVertical: AppSpacing.xl * 2, alignItems: 'center', gap: AppSpacing.sm },
  emptyCompact: { gap: AppSpacing.sm, paddingVertical: AppSpacing.xs, alignItems: 'flex-start' },
  emptyTitle: { ...AppTypography.heading, color: AppColors.text },
  emptyBody: { ...AppTypography.caption, fontSize: 14, lineHeight: 21, color: AppColors.textSecondary },
  emptyButton: { marginTop: AppSpacing.xs, paddingHorizontal: AppSpacing.xl, minHeight: 44, borderRadius: 999,
    backgroundColor: AppColors.primary, alignItems: 'center', justifyContent: 'center' },
  emptyButtonText: { ...AppTypography.label, color: AppColors.surface },
  pressed: { opacity: 0.6 },
});
