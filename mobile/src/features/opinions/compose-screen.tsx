import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Page } from '@/components/page';
import { RequireSession } from '@/components/require-session';
import { ResourceContent } from '@/components/resource-content';
import { AppButton } from '@/components/ui/app-button';
import { FormField } from '@/components/ui/form-field';
import { Body, ErrorNotice, Notice, Panel } from '@/components/ui/content-blocks';
import { CoachPanel } from './coach-panel';
import { StyleSheet, Text, View } from 'react-native';
import { AnonAvatar, displayName } from '@/components/ui/stance';
import { AppColors, AppSpacing, AppTypography, StanceColors } from '@/constants/theme';
import { isClosed, LIMITS, STANCE_LABEL, validateOpinion } from '@/features/core/rules';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { useMutation } from '@/hooks/use-mutation';
import { dataSource, gateway } from '@/services/gateway';
import type { CoachResult, Debate, Opinion } from '@/types/core';
import { useSession } from '@/features/session/session-provider';

export default function ComposeScreen({ reply = false }: { reply?: boolean }) {
  const { revision } = useSession();
  return <ComposeContent key={revision} reply={reply} />;
}
function ComposeContent({ reply = false }: { reply?: boolean }) {
  const { id, opinionId } = useLocalSearchParams<{ id: string; opinionId?: string }>();
  const loader = useCallback(async () => ({ debate: await gateway.getDebate(id), parent: reply && opinionId ? await gateway.getOpinion(id, opinionId) : null }), [id, opinionId, reply]);
  const { resource, reload } = useFocusResource(loader);
  return <Page title={reply ? '답글 · 반박 작성' : '의견 작성'}><RequireSession>
    <ResourceContent resource={resource} reload={reload}>{(data) => <ComposeForm {...data} reply={reply} />}</ResourceContent>
  </RequireSession></Page>;
}
function ComposeForm({ debate, parent, reply }: { debate: Debate; parent: Opinion | null; reply: boolean }) {
  const [content, setContent] = useState('');
  const [requestId] = useState(() => `opinion-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const mutation = useMutation();
  // 작성 코치: 올리기 전에 한 번만 확인한다. 제안을 본 뒤에는 다시 묻지 않고 사용자가 고른 글을 올린다.
  const [coach, setCoach] = useState<CoachResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [coached, setCoached] = useState(false);
  if (dataSource === 'api' ? debate.status === 'CLOSED' : isClosed(debate)) return <Notice>종료된 토론에는 글을 작성할 수 없습니다.</Notice>;
  if (!debate.membership) return <><Notice>입장을 선택하고 토론에 참여한 뒤 의견을 남길 수 있습니다.</Notice>
    <AppButton label="입장 선택" onPress={() => router.navigate({ pathname: '/discussions/[id]/join', params: { id: debate.id } })} /></>;
  if (reply && !parent) return <Notice>답글을 작성할 원래 의견을 찾을 수 없습니다.</Notice>;
  const post = (text: string) => void mutation.run(() => gateway.postOpinion({ debateId: debate.id, parentId: parent?.id, content: text }, requestId), () => {
    if (parent) router.replace({ pathname: '/discussions/[id]/threads/[opinionId]', params: { id: debate.id, opinionId: parent.id } });
    else router.replace({ pathname: '/discussions/[id]', params: { id: debate.id } });
  });
  async function submit() {
    if (gateway.coachOpinion && !coached) {
      setChecking(true);
      const result = await gateway.coachOpinion({ debateId: debate.id, parentId: parent?.id, content })
        .catch((): CoachResult => ({ verdict: 'UNAVAILABLE', reasons: [], suggestion: null }));
      setChecking(false);
      if (result.verdict === 'SUGGEST' && result.suggestion) { setCoached(true); setCoach(result); return; }
    }
    post(content);
  }
  const stance = debate.membership.currentStance;
  return <>
    <Text style={styles.debateTitle}>{debate.title}</Text>
    <View style={styles.me}>
      <AnonAvatar authorName="" anonymousNo={debate.membership.anonymousNo ?? null} size={36} />
      <View style={styles.meText}>
        <Text style={styles.meTitle}>이 토론에서 나는 {debate.membership.anonymousNo ? displayName('', debate.membership.anonymousNo) : '익명'}이에요</Text>
      </View>
      <Text style={[styles.stance, { color: StanceColors[debate.membership.currentStance].text, backgroundColor: StanceColors[debate.membership.currentStance].tint }]}>
        {STANCE_LABEL[debate.membership.currentStance]}
      </Text>
    </View>
    {parent && <Panel><Body>{displayName(parent.authorName, parent.anonymousNo)}의 의견에 답글</Body><Body>{parent.content}</Body></Panel>}
    <FormField label="한마디 남겨 주세요" value={content} onChangeText={(text) => { setContent(text); setCoach(null); }} maxLength={LIMITS.opinion} counter multiline
      placeholder="근거를 들어 생각을 적어 주세요. 올린 뒤에는 고칠 수 없어요."
      style={{ backgroundColor: StanceColors[debate.membership.currentStance].tint, borderColor: StanceColors[debate.membership.currentStance].tint }} />
    <ErrorNotice message={mutation.error} />
    {coach?.suggestion
      ? <CoachPanel original={content} result={coach} stance={stance} pending={mutation.pending}
          onUseSuggestion={() => post(coach.suggestion!)}
          onEdit={() => { setContent(coach.suggestion!); setCoach(null); }}
          onKeepOriginal={() => post(content)} />
      : <AppButton label={checking ? '표현 확인 중' : reply ? '답글 남기기' : `${STANCE_LABEL[stance]} 쪽에 남기기`} variant="primary"
          disabled={!!validateOpinion(content) || checking} loading={mutation.pending || checking} onPress={() => void submit()} />}
  </>;
}

const styles = StyleSheet.create({
  debateTitle: { ...AppTypography.caption, fontSize: 14, color: AppColors.textSecondary },
  me: { flexDirection: 'row', alignItems: 'center', gap: AppSpacing.md, padding: 14, borderRadius: 16, backgroundColor: AppColors.soft },
  meText: { flex: 1, gap: 2 },
  meTitle: { ...AppTypography.label, fontWeight: '700', color: AppColors.text },
  meSub: { ...AppTypography.caption, fontSize: 12, color: AppColors.textSecondary },
  stance: { ...AppTypography.caption, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },
});
