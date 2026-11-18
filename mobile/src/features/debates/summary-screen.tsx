import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Page } from '@/components/page';
import { ResourceContent } from '@/components/resource-content';
import { AppButton } from '@/components/ui/app-button';
import { Caption, Notice } from '@/components/ui/content-blocks';
import { Icon } from '@/components/ui/icon';
import { AppColors, AppRadius, AppSpacing, AppTypography, StanceColors } from '@/constants/theme';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { dataSource, gateway } from '@/services/gateway';
import { useSession } from '@/features/session/session-provider';
import { withAuthRevision } from '@/services/basic-auth';
import type { Stance } from '@/types/core';

// 섹션 제목('찬성 핵심 근거' 등)으로 입장을 판별해 B안의 말풍선 색과 제목을 붙인다.
function sideOf(title: string): Stance {
  if (title.startsWith('찬성')) return 'PRO';
  if (title.startsWith('반대')) return 'CON';
  return 'NEUTRAL';
}
const HEADING: Record<Stance, string> = { PRO: '찬성 쪽은 이렇게 말해요', CON: '반대 쪽은 이렇게 말해요', NEUTRAL: '유보 쪽은 이렇게 말해요' };

// 서버는 항목을 '- 문장' 줄로 저장한다. 줄마다 하나의 말풍선으로 나눈다.
function itemsOf(text: string) {
  const lines = text.split('\n').map((line) => line.replace(/^\s*-\s*/, '').trim()).filter(Boolean);
  return lines.length ? lines : [text];
}

// 근거 의견 번호 버튼. 누르면 그 의견의 대화(반박 포함)로 이동한다.
function Sources({ debateId, ids }: { debateId: string; ids: string[] }) {
  return <View style={styles.sources}>
    <Text style={styles.sourceText}>근거 의견</Text>
    {ids.map((opinionId, index) => <Pressable key={opinionId} accessibilityRole="button" accessibilityLabel={`바탕이 된 의견 ${index + 1} 보기`}
      onPress={() => router.navigate({ pathname: '/discussions/[id]/threads/[opinionId]', params: { id: debateId, opinionId } })}
      style={({ pressed }) => [styles.source, pressed && styles.pressed]}>
      <Text style={styles.sourceLink}>{index + 1}</Text>
      <Icon name="right" size={12} color={AppColors.textSecondary} strokeWidth={2} />
    </Pressable>)}
  </View>;
}

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { revision } = useSession();
  const loader = useCallback(() => withAuthRevision(revision, () => gateway.getSummary(id)), [id, revision]);
  const { resource, reload } = useFocusResource(loader);
  return <Page title="AI 요약">
    {dataSource === 'mock' && <Notice>현재는 AI 서버를 호출하지 않는 데모 요약입니다. 화면 구조와 원문 이동을 확인할 수 있습니다.</Notice>}
    <ResourceContent resource={resource} reload={reload}>{(summary) => <>
      <View style={styles.lead}>
        <Icon name="spark" size={18} strokeWidth={1.7} />
        <Text style={styles.leadText}>AI가 정리한 양쪽 이야기</Text>
      </View>
      {summary.generatedAt && <Caption>{new Date(summary.generatedAt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}에 공감 많이 받은 의견을 읽고 정리했어요.</Caption>}
      {summary.sections.length === 0 && <Notice>의견이 더 모이면 양쪽 이야기를 정리해 드려요.</Notice>}
      {summary.sections.map((section) => {
        const side = sideOf(section.title);
        const tone = StanceColors[side];
        const right = side === 'CON';
        return <View key={section.title} style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={[styles.dot, { backgroundColor: tone.text }]} />
            <Text accessibilityRole="header" style={[styles.sectionTitle, { color: tone.text }]}>{HEADING[side]}</Text>
          </View>
          {(section.items ?? itemsOf(section.text).map((text) => ({ text, opinionIds: [] as string[] }))).map((item, index) => <View key={index} style={styles.itemBlock}>
            <View style={[styles.item, { backgroundColor: tone.tint }, right ? styles.itemRight : styles.itemLeft]}>
              <Text style={styles.itemText}>{item.text}</Text>
            </View>
            {item.opinionIds.length > 0 && <Sources debateId={id} ids={item.opinionIds} />}
          </View>)}
          {!section.items && section.opinionIds.length > 0 && <Sources debateId={id} ids={section.opinionIds} />}
        </View>;
      })}
      <Text style={styles.note}>토론에 올라온 글만 읽고 정리해요. 어느 쪽이 옳은지는 판단하지 않아요.</Text>
      <AppButton label="요약 다시 불러오기" onPress={reload} />
    </>}</ResourceContent>
  </Page>;
}

const styles = StyleSheet.create({
  lead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leadText: { ...AppTypography.label, fontSize: 14, fontWeight: '700', color: AppColors.text },
  section: { gap: AppSpacing.sm + 2 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: AppSpacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { ...AppTypography.heading, fontSize: 17 },
  itemBlock: { gap: 6 },
  item: { borderRadius: AppRadius.bubble, paddingHorizontal: 16, paddingVertical: 14 },
  itemLeft: { borderTopLeftRadius: 4 },
  itemRight: { borderTopRightRadius: 4 },
  itemText: { ...AppTypography.body, fontWeight: '500', lineHeight: 24, color: AppColors.text },
  sources: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: AppSpacing.xs },
  source: { flexDirection: 'row', alignItems: 'center', gap: 1, minHeight: 32, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1.5, borderColor: AppColors.border },
  sourceLink: { ...AppTypography.caption, fontWeight: '700', color: AppColors.text },
  sourceText: { ...AppTypography.caption, fontWeight: '500', color: AppColors.textSecondary },
  note: { ...AppTypography.caption, color: AppColors.textFaint },
  pressed: { opacity: 0.6 },
});
