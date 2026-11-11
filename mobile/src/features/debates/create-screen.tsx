import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Page } from '@/components/page';
import { RequireSession } from '@/components/require-session';
import { AppButton } from '@/components/ui/app-button';
import { FormField } from '@/components/ui/form-field';
import { Body, Caption, ErrorNotice, Heading, Notice, Panel, Row } from '@/components/ui/content-blocks';
import { ChoiceGroup } from '@/features/core/choice-group';
import { CREATE_CATEGORIES, LIMITS, validateDebate } from '@/features/core/rules';
import { useSession } from '@/features/session/session-provider';
import { useMutation } from '@/hooks/use-mutation';
import { dataSource, gateway } from '@/services/gateway';
import { getPublicCategories } from '@/services/public-api';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { ResourceContent } from '@/components/resource-content';
import { withAuthRevision } from '@/services/basic-auth';
import type { CreateDebateInput, SavedDraft } from '@/types/core';

export default function CreateScreen() {
  const { revision } = useSession();
  const { draftId } = useLocalSearchParams<{ draftId?: string }>();
  return <Page title="토론 만들기"><RequireSession>{dataSource === 'api' ? <ServerCreateForm key={`${revision}/${draftId ?? 'new'}`} draftId={draftId} /> : <CreateForm />}</RequireSession></Page>;
}
function ServerCreateForm({ draftId }: { draftId?: string }) {
  const { revision } = useSession();
  const loader = useCallback(() => withAuthRevision(revision, async () => {
    const [categories, draft] = await Promise.all([getPublicCategories(), draftId ? gateway.getDraft!(draftId) : Promise.resolve(undefined)]);
    return { categories, draft };
  }), [revision, draftId]);
  const { resource, reload } = useFocusResource(loader);
  return <ResourceContent resource={resource} reload={reload}>{({ categories, draft }) => categories.length ? <CreateForm categories={categories.map((item) => item.name)} initialDraft={draft} /> : <Notice>게시할 서버 카테고리가 없습니다.</Notice>}</ResourceContent>;
}
function CreateForm({ categories = [...CREATE_CATEGORIES], initialDraft }: { categories?: string[]; initialDraft?: SavedDraft }) {
  const [step, setStep] = useState(1);
  const [input, setInput] = useState<CreateDebateInput>(initialDraft?.input ?? { category: '', kind: 'QUICK', durationMinutes: 15, title: '', content: '' });
  const [draftId, setDraftId] = useState(initialDraft?.id);
  const [savedSignature, setSavedSignature] = useState(initialDraft ? JSON.stringify(initialDraft.input) : '');
  const [requestId] = useState(() => `create-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const { profile, refresh } = useSession();
  const mutation = useMutation();
  function patch<K extends keyof CreateDebateInput>(key: K, value: CreateDebateInput[K]) { if (!mutation.pending) setInput((current) => ({ ...current, [key]: value })); }
  const firstValid = !!input.category && (input.kind === 'ENDLESS' || (input.durationMinutes >= 5 && input.durationMinutes <= 15));
  const error = validateDebate(input, categories);
  return <>
    <Caption>0{step} / 03 · {['주제와 방식', '제목과 내용', '마지막 확인'][step - 1]}</Caption>
    {step === 1 && <>
      <Heading>어떤 이야기를 나눌까요?</Heading>
      <ChoiceGroup options={categories.map((value) => ({ value, label: value }))} value={input.category} disabled={mutation.pending} onChange={(value) => patch('category', value)} />
      <Heading>토론 방식</Heading>
      <ChoiceGroup options={[{ value: 'QUICK', label: '간단토론' }, { value: 'ENDLESS', label: '끝장토론' }]} value={input.kind} disabled={mutation.pending} onChange={(value) => patch('kind', value)} />
      <Notice>간단토론은 5~15분, 끝장토론은 3일 동안 진행돼요.</Notice>
      {input.kind === 'QUICK' && <Panel><Body>진행 시간: {input.durationMinutes}분</Body>
        <Row><AppButton label="− 1분" disabled={input.durationMinutes <= 5} onPress={() => patch('durationMinutes', input.durationMinutes - 1)} />
          <AppButton label="+ 1분" disabled={input.durationMinutes >= 15} onPress={() => patch('durationMinutes', input.durationMinutes + 1)} /></Row>
      </Panel>}
      <AppButton label="다음 · 내용 작성" variant="primary" disabled={!firstValid || mutation.pending} onPress={() => setStep(2)} />
    </>}
    {step === 2 && <>
      <Heading>토론 내용 작성</Heading>
      <FormField label="제목" value={input.title} onChangeText={(value) => patch('title', value)} maxLength={LIMITS.title} counter placeholder="토론할 질문을 입력해 주세요" />
      <FormField label="내용" value={input.content} onChangeText={(value) => patch('content', value)} maxLength={LIMITS.content} counter multiline placeholder="서로 이야기할 배경과 쟁점을 적어 주세요" />
      <AppButton label="다음 · 비용 확인" variant="primary" disabled={!!error || mutation.pending} onPress={() => setStep(3)} />
    </>}
    {step === 3 && <>
      <Heading>비용 확인과 게시</Heading>
      <Panel><Caption>{input.category} · {input.kind === 'QUICK' ? `간단토론 · ${input.durationMinutes}분` : '끝장토론 · 3일'}</Caption>
        <Heading>{input.title}</Heading><Body>{input.content}</Body></Panel>
      <Notice>{dataSource === 'api' ? '실제 서버에 게시하며 시연 계정의 코인 1개가 차감됩니다.' : '데모 코인 1개를 사용합니다. 실제 결제나 서버 게시가 아닙니다.'}</Notice>
      <Panel><Body>현재 잔액: {profile?.coins == null ? '서버에서 게시 시 확인' : `${profile.coins} 코인`}</Body><Body>필요한 코인: {LIMITS.cost} 코인</Body>
        {profile?.coins != null && <Body>게시 후 예상 잔액: {Math.max(0, profile.coins - LIMITS.cost)} 코인</Body>}</Panel>
      {dataSource === 'mock' && <Caption>데모 제한: 하루 3개, 동시에 진행 중인 내 토론 3개까지.</Caption>}
      <AppButton label={dataSource === 'api' ? '1코인으로 서버에 게시하기' : '1코인으로 데모 게시하기'} variant="primary" disabled={!!error || (dataSource === 'mock' && (profile?.coins ?? 0) < LIMITS.cost)} loading={mutation.pending}
        onPress={() => void mutation.run(async () => { const debate = dataSource === 'api' && draftId ? await gateway.publishDraft!(draftId, input) : await gateway.createDebate(input, requestId); await refresh(); return debate; },
          (debate) => router.replace({ pathname: '/discussions/[id]', params: { id: debate.id } }))} />
    </>}
    {dataSource === 'api' && <>
      {draftId && <Caption>서버 초안 ID: {draftId} · {savedSignature === JSON.stringify(input) ? '현재 내용 저장됨' : '저장하지 않은 변경 있음'}</Caption>}
      <AppButton label={draftId ? '초안 변경 저장' : '게시 전 초안 저장'} disabled={!!error} loading={mutation.pending} onPress={() => {
        const snapshot = { ...input };
        void mutation.run(() => gateway.saveDraft!(snapshot, requestId, draftId), (draft) => { setDraftId(draft.id); setSavedSignature(JSON.stringify(snapshot)); });
      }} />
      <AppButton label="저장한 초안 보기" disabled={mutation.pending} onPress={() => router.navigate('/discussions/drafts')} />
    </>}
    <ErrorNotice message={mutation.error} />
    {step > 1 && <AppButton label="이전 단계" disabled={mutation.pending} onPress={() => setStep(step - 1)} />}
  </>;
}
