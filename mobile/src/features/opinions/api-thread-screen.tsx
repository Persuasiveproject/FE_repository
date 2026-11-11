import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Page } from '@/components/page';
import { ResourceContent } from '@/components/resource-content';
import { AppButton } from '@/components/ui/app-button';
import { Notice } from '@/components/ui/content-blocks';
import { getPublicDetail, getRecentPublicPost, toOpinionCard } from '@/services/public-debate-api';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { useSession } from '@/features/session/session-provider';
import { withAuthRevision } from '@/services/basic-auth';
import { OpinionCard } from './opinion-card';
import { PublicOpinionFeed } from './public-opinion-feed';

export default function ApiThreadScreen() {
  const { id, opinionId } = useLocalSearchParams<{ id: string; opinionId: string }>();
  const { profile, revision } = useSession();
  const loader = useCallback(() => withAuthRevision(revision, () => getPublicDetail(id)), [id, revision]);
  const { resource, reload } = useFocusResource(loader);
  const parent = getRecentPublicPost(id, opinionId);
  return <Page title="의견과 반박">
    <ResourceContent resource={resource} reload={reload}>{(debate) => <>
      {parent ? <OpinionCard item={toOpinionCard(parent)} disabled={debate.status === 'CLOSED'} canVote={false} onVote={() => {}}
        onReply={() => router.navigate({ pathname: '/discussions/[id]/reply/[opinionId]', params: { id, opinionId } })}
        canPersuade={!!profile && !!debate.myParticipation && debate.status === 'OPEN' && debate.myParticipation.anonymousNo !== parent.anonymousNo}
        onPersuaded={() => router.navigate({ pathname: '/discussions/[id]/vote', params: { id, opinionId } })} />
        : <Notice>원문은 토론방에서 확인해 주세요.</Notice>}
      <PublicOpinionFeed key={`${id}/${opinionId}/${revision}`} debateId={id} parentId={opinionId} membership={debate.myParticipation} closed={debate.status === 'CLOSED'} />
    </>}</ResourceContent>
    <AppButton label="토론 보기" onPress={() => router.navigate({ pathname: '/discussions/[id]', params: { id } })} />
  </Page>;
}
