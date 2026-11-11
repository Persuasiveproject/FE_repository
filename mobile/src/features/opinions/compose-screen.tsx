import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Page } from '@/components/page';
import { RequireSession } from '@/components/require-session';
import { ResourceContent } from '@/components/resource-content';
import { AppButton } from '@/components/ui/app-button';
import { FormField } from '@/components/ui/form-field';
import { Body, ErrorNotice, Notice, Panel } from '@/components/ui/content-blocks';
import { isClosed, LIMITS, STANCE_LABEL, validateOpinion } from '@/features/core/rules';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { useMutation } from '@/hooks/use-mutation';
import { dataSource, gateway } from '@/services/gateway';
import type { Debate, Opinion } from '@/types/core';
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
  if (dataSource === 'api' ? debate.status === 'CLOSED' : isClosed(debate)) return <Notice>종료된 토론에는 글을 작성할 수 없습니다.</Notice>;
  if (!debate.membership) return <><Notice>입장을 선택하고 토론에 참여한 뒤 의견을 남길 수 있습니다.</Notice>
    <AppButton label="입장 선택" onPress={() => router.navigate({ pathname: '/discussions/[id]/join', params: { id: debate.id } })} /></>;
  if (reply && !parent) return <Notice>답글을 작성할 원래 의견을 찾을 수 없습니다.</Notice>;
  return <>
    <Notice>내 입장 · {STANCE_LABEL[debate.membership.currentStance]}로 의견을 남겨요. 등록 후에는 수정할 수 없어요.</Notice>
    {parent && <Panel><Body>{parent.authorName}의 의견에 답글</Body><Body>{parent.content}</Body></Panel>}
    <FormField label="본문" value={content} onChangeText={setContent} maxLength={LIMITS.opinion} counter multiline placeholder="서로 존중하며 근거와 생각을 적어 주세요" />
    <ErrorNotice message={mutation.error} />
    <AppButton label={reply ? '답글 등록' : '의견 등록'} variant="primary" disabled={!!validateOpinion(content)} loading={mutation.pending}
      onPress={() => void mutation.run(() => gateway.postOpinion({ debateId: debate.id, parentId: parent?.id, content }, requestId), () => {
        if (parent) router.replace({ pathname: '/discussions/[id]/threads/[opinionId]', params: { id: debate.id, opinionId: parent.id } });
        else router.replace({ pathname: '/discussions/[id]', params: { id: debate.id } });
      })} />
  </>;
}
