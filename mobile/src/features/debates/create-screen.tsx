import { router } from 'expo-router';
import { useState } from 'react';
import { Page } from '@/components/page';
import { RequireSession } from '@/components/require-session';
import { AppButton } from '@/components/ui/app-button';
import { FormField } from '@/components/ui/form-field';
import { Body, Caption, ErrorNotice, Heading, Notice, Panel, Row } from '@/components/ui/content-blocks';
import { ChoiceGroup } from '@/features/core/choice-group';
import { CREATE_CATEGORIES, LIMITS, validateDebate } from '@/features/core/rules';
import { useSession } from '@/features/session/session-provider';
import { useMutation } from '@/hooks/use-mutation';
import { gateway } from '@/services/gateway';
import type { CreateDebateInput } from '@/types/core';

export default function CreateScreen() {
  return <Page title="토론 만들기"><RequireSession><CreateForm /></RequireSession></Page>;
}
function CreateForm() {
  const [step, setStep] = useState(1);
  const [input, setInput] = useState<CreateDebateInput>({ category: '', kind: 'QUICK', durationMinutes: 15, title: '', content: '' });
  const [requestId] = useState(() => `create-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const { profile, refresh } = useSession();
  const mutation = useMutation();
  function patch<K extends keyof CreateDebateInput>(key: K, value: CreateDebateInput[K]) { setInput((current) => ({ ...current, [key]: value })); }
  const firstValid = !!input.category && (input.kind === 'ENDLESS' || (input.durationMinutes >= 5 && input.durationMinutes <= 15));
  const error = validateDebate(input);
  return <>
    <Caption>0{step} / 03 · {['주제와 방식', '제목과 내용', '마지막 확인'][step - 1]}</Caption>
    {step === 1 && <>
      <Heading>어떤 이야기를 나눌까요?</Heading>
      <ChoiceGroup options={CREATE_CATEGORIES.map((value) => ({ value, label: value }))} value={input.category} onChange={(value) => patch('category', value)} />
      <Heading>토론 방식</Heading>
      <ChoiceGroup options={[{ value: 'QUICK', label: '간단토론' }, { value: 'ENDLESS', label: '끝장토론' }]} value={input.kind} onChange={(value) => patch('kind', value)} />
      <Notice>간단토론은 5~15분, 끝장토론은 3일 동안 진행돼요.</Notice>
      {input.kind === 'QUICK' && <Panel><Body>진행 시간: {input.durationMinutes}분</Body>
        <Row><AppButton label="− 1분" disabled={input.durationMinutes <= 5} onPress={() => patch('durationMinutes', input.durationMinutes - 1)} />
          <AppButton label="+ 1분" disabled={input.durationMinutes >= 15} onPress={() => patch('durationMinutes', input.durationMinutes + 1)} /></Row>
      </Panel>}
      <AppButton label="다음 · 내용 작성" variant="primary" disabled={!firstValid} onPress={() => setStep(2)} />
    </>}
    {step === 2 && <>
      <Heading>토론 내용 작성</Heading>
      <FormField label="제목" value={input.title} onChangeText={(value) => patch('title', value)} maxLength={LIMITS.title} counter placeholder="토론할 질문을 입력해 주세요" />
      <FormField label="내용" value={input.content} onChangeText={(value) => patch('content', value)} maxLength={LIMITS.content} counter multiline placeholder="서로 이야기할 배경과 쟁점을 적어 주세요" />
      <AppButton label="다음 · 비용 확인" variant="primary" disabled={!!error} onPress={() => setStep(3)} />
    </>}
    {step === 3 && <>
      <Heading>비용 확인과 게시</Heading>
      <Panel><Caption>{input.category} · {input.kind === 'QUICK' ? `간단토론 · ${input.durationMinutes}분` : '끝장토론 · 3일'}</Caption>
        <Heading>{input.title}</Heading><Body>{input.content}</Body></Panel>
      <Notice>데모 코인 {LIMITS.cost}개를 사용합니다. 실제 결제나 서버 게시가 아닙니다.</Notice>
      <Panel><Body>현재 잔액: {profile?.coins ?? 0} 코인</Body><Body>필요한 코인: {LIMITS.cost} 코인</Body>
        <Body>게시 후 잔액: {Math.max(0, (profile?.coins ?? 0) - LIMITS.cost)} 코인</Body></Panel>
      <Caption>데모 제한: 하루 3개, 동시에 진행 중인 내 토론 3개까지. 실제 정책은 BE와 확정해야 합니다.</Caption>
      <AppButton label="1코인으로 데모 게시하기" variant="primary" disabled={!!error || (profile?.coins ?? 0) < LIMITS.cost} loading={mutation.pending}
        onPress={() => void mutation.run(async () => { const debate = await gateway.createDebate(input, requestId); await refresh(); return debate; },
          (debate) => router.replace({ pathname: '/discussions/[id]', params: { id: debate.id } }))} />
    </>}
    <ErrorNotice message={mutation.error} />
    {step > 1 && <AppButton label="이전 단계" disabled={mutation.pending} onPress={() => setStep(step - 1)} />}
  </>;
}
