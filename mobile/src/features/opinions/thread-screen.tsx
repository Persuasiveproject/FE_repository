import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Page } from '@/components/page';
import { ResourceContent } from '@/components/resource-content';
import { AppButton } from '@/components/ui/app-button';
import { ErrorNotice, Heading, Notice } from '@/components/ui/content-blocks';
import { ChoiceGroup } from '@/features/core/choice-group';
import { isClosed, STANCES, STANCE_LABEL } from '@/features/core/rules';
import { useSession } from '@/features/session/session-provider';
import { OpinionCard } from '@/features/opinions/opinion-card';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { useMutation } from '@/hooks/use-mutation';
import { gateway } from '@/services/gateway';
import type { Stance } from '@/types/core';

export default function ThreadScreen() {
  const { id, opinionId } = useLocalSearchParams<{ id: string; opinionId: string }>();
  const loader = useCallback(async () => ({ debate: await gateway.getDebate(id), parent: await gateway.getOpinion(id, opinionId), replies: await gateway.listOpinions(id, opinionId) }), [id, opinionId]);
  const { resource, reload } = useFocusResource(loader);
  const { profile } = useSession();
  const [filter, setFilter] = useState<Stance | 'ALL'>('ALL');
  const mutation = useMutation();
  return <Page title="의견과 반박">
    <ResourceContent resource={resource} reload={reload}>{({ debate, parent, replies }) => {
      const closed = isClosed(debate);
      const canVote = !!profile && !!debate.membership && !closed;
      const visibleReplies = replies.filter((item) => filter === 'ALL' || item.stance === filter);
      return <>
        <OpinionCard item={parent} disabled={mutation.pending || closed} canVote={canVote && parent.authorId !== profile?.id}
          onReply={() => router.navigate({ pathname: '/discussions/[id]/reply/[opinionId]', params: { id, opinionId: parent.id } })}
          onPersuaded={() => router.navigate({ pathname: '/discussions/[id]/vote', params: { id, opinionId: parent.id } })}
          onVote={(vote) => void mutation.run(() => gateway.voteOpinion(id, parent.id, vote), reload)} />
        <Heading>답글 {replies.length}개</Heading>
        <ChoiceGroup options={[{ value: 'ALL', label: '전체' }, ...STANCES.map((value) => ({ value, label: STANCE_LABEL[value] }))]} value={filter} onChange={setFilter} layout="row" />
        {visibleReplies.map((item) => <OpinionCard key={item.id} item={item}
          disabled={mutation.pending || closed} canVote={canVote && item.authorId !== profile?.id}
          onPersuaded={() => router.navigate({ pathname: '/discussions/[id]/vote', params: { id, opinionId: item.id } })}
          onVote={(vote) => void mutation.run(() => gateway.voteOpinion(id, item.id, vote), reload)} />)}
        {visibleReplies.length === 0 && <Notice>{replies.length === 0 ? '첫 답글을 남겨 보세요.' : '이 입장의 답글은 아직 없습니다.'}</Notice>}
        <ErrorNotice message={mutation.error} />
        {!closed && <AppButton label="이 의견에 답글 쓰기" variant="primary" onPress={() => router.navigate({ pathname: '/discussions/[id]/reply/[opinionId]', params: { id, opinionId } })} />}
        {closed && <Notice>종료된 토론의 의견은 읽기만 가능합니다.</Notice>}
      </>;
    }}</ResourceContent>
  </Page>;
}
