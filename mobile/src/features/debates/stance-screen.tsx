import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Page } from '@/components/page';
import { RequireSession } from '@/components/require-session';
import { ResourceContent } from '@/components/resource-content';
import { AppButton } from '@/components/ui/app-button';
import { Body, Caption, ErrorNotice, Heading, Notice, Panel } from '@/components/ui/content-blocks';
import { ChoiceGroup } from '@/features/core/choice-group';
import { isClosed, STANCES, STANCE_LABEL } from '@/features/core/rules';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { useMutation } from '@/hooks/use-mutation';
import { useSession } from '@/features/session/session-provider';
import { dataSource, gateway } from '@/services/gateway';
import type { Debate, Opinion, Stance } from '@/types/core';

export default function StanceScreen({ mode }: { mode: 'join' | 'change' }) {
  const { revision } = useSession();
  return <StanceContent key={revision} mode={mode} />;
}
function StanceContent({ mode }: { mode: 'join' | 'change' }) {
  const { id, opinionId } = useLocalSearchParams<{ id: string; opinionId?: string }>();
  const loader = useCallback(async () => {
    const debate = await gateway.getDebate(id);
    const opinions = await gateway.listOpinions(id);
    // 펼친 답글의 '영업'으로 진입해도 선택한 근거가 화면에 보이도록 포함합니다.
    if (opinionId && !opinions.some((item) => item.id === opinionId)) opinions.push(await gateway.getOpinion(id, opinionId));
    return { debate, opinions };
  }, [id, opinionId]);
  const { resource, reload } = useFocusResource(loader);
  return <Page title={mode === 'join' ? '입장 선택' : '투표 · 입장 변경'}><RequireSession>
    <ResourceContent resource={resource} reload={reload}>{(data) => <StanceForm {...data} mode={mode} selectedOpinionId={opinionId} reload={reload} />}</ResourceContent>
  </RequireSession></Page>;
}
function StanceForm({ debate, opinions, mode, selectedOpinionId, reload }: { debate: Debate; opinions: Opinion[]; mode: 'join' | 'change'; selectedOpinionId?: string; reload: () => void }) {
  const [stance, setStance] = useState<Stance | ''>(mode === 'change' ? debate.membership?.currentStance ?? '' : '');
  const [source, setSource] = useState(selectedOpinionId ?? '');
  const mutation = useMutation();
  const { profile } = useSession();
  const closed = dataSource === 'api' ? debate.status === 'CLOSED' : isClosed(debate);
  function openRoom() { router.replace({ pathname: '/discussions/[id]', params: { id: debate.id } }); }
  if (closed) return <><Notice>종료된 토론에서는 입장을 선택하거나 변경할 수 없습니다.</Notice><AppButton label="토론 보기" onPress={openRoom} /></>;
  if (mode === 'change' && !debate.membership) return <><Notice>먼저 토론에 참여해 주세요.</Notice><AppButton label="입장 선택" onPress={() => router.replace({ pathname: '/discussions/[id]/join', params: { id: debate.id } })} /></>;
  if (mode === 'join' && debate.membership) return <><Notice>이미 참여 중입니다.</Notice><AppButton label="토론 보기" onPress={openRoom} /></>;
  return <>
    <Heading>{debate.title}</Heading><Body>{debate.description}</Body>
    {mode === 'change' && <>
      <Caption>최초 입장 · {debate.membership ? STANCE_LABEL[debate.membership.initialStance] : ''}</Caption>
      <Heading>어떤 의견이 생각을 바꿨나요?</Heading>
      <Caption>근거 의견은 선택 사항입니다. 나의 글은 선택할 수 없습니다.</Caption>
      <AppButton label="근거 없이 변경" selected={!source} onPress={() => setSource('')} />
      {opinions.filter((item) => item.authorId !== profile?.id).map((item) => <Panel key={item.id}>
        <Caption>{item.authorName} · {STANCE_LABEL[item.stance]}</Caption><Body>{item.content}</Body>
        <AppButton label="이 의견 선택" selected={source === item.id} onPress={() => setSource(item.id)} />
      </Panel>)}
    </>}
    <Heading>나의 입장을 골라주세요</Heading>
    <ChoiceGroup options={STANCES.map((value) => ({ value, label: STANCE_LABEL[value] }))} value={stance} onChange={setStance} disabled={mutation.pending} />
    <Notice>{mode === 'join' ? '다른 사람의 선택은 토론이 끝난 뒤 공개돼요.' : '처음 선택한 입장과 이미 작성한 글의 입장은 바뀌지 않아요.'}</Notice>
    <ErrorNotice message={mutation.error} />
    <AppButton label={mode === 'join' ? '이 입장으로 참여하기' : '입장 변경'} variant="primary" loading={mutation.pending}
      disabled={!stance || (mode === 'change' && stance === debate.membership?.currentStance)}
      onPress={() => { if (!stance) return; void mutation.run(() => mode === 'join' ? gateway.joinDebate(debate.id, stance) : gateway.changeStance({ debateId: debate.id, stance, opinionId: source || undefined, version: debate.membership!.version }), openRoom); }} />
    {!!mutation.error && <AppButton label="최신 상태 다시 불러오기" onPress={reload} />}
  </>;
}
