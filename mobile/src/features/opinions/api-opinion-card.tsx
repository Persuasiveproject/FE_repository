import { AppButton } from '@/components/ui/app-button';
import { Caption, ErrorNotice } from '@/components/ui/content-blocks';
import { useOpinionReaction } from '@/hooks/use-opinion-reaction';
import { opinionReactionsEnabled } from '@/services/opinion-reaction-api';
import { toOpinionCard } from '@/services/public-debate-api';
import type { PublicPostDto } from '@/types/api';
import type { Membership } from '@/types/core';
import { OpinionCard } from './opinion-card';

type Props = {
  post: PublicPostDto; membership?: Membership | null; closed?: boolean;
  onOpen?: () => void; onReply?: () => void; onPersuaded?: () => void; repliesExpanded?: boolean;
};
// 공통 카드의 디자인은 그대로 두고 실제 서버 반응·오류·재시도만 연결합니다.
export function ApiOpinionCard({ post, membership, closed = false, ...actions }: Props) {
  const reaction = useOpinionReaction(post, membership, closed);
  const { state } = reaction;
  const counts = state.counts ?? post;
  const item = { ...toOpinionCard(post), upvotes: counts.upvoteCount, downvotes: counts.downvoteCount,
    myVote: state.reaction === 'UNKNOWN' ? undefined : state.reaction };
  return <>
    <OpinionCard item={item} {...actions} canVote={reaction.canVote} onVote={reaction.press} votePending={state.pending} countsUnavailable={state.countsUnavailable}
      canPersuade={reaction.access.signedIn && reaction.access.participant && !reaction.closed && !reaction.access.own} disabled={reaction.closed} />
    {opinionReactionsEnabled() && <>
      {!!reaction.blockReason && <Caption>{reaction.blockReason}</Caption>}
      {state.pending && <Caption>반응 처리 중…</Caption>}
      <ErrorNotice message={state.error} />
      {!!state.retry && <AppButton label={state.retry.phase === 'counts' ? '표수 다시 확인' : '반응 요청 다시 시도'}
        loading={state.pending} disabled={state.retry.phase === 'write' && (!!reaction.blockReason || state.blocked)} onPress={reaction.retry} />}
      {state.reaction === 'UNKNOWN' && reaction.canVote && <AppButton label="내 반응 취소" onPress={reaction.cancel} />}
    </>}
  </>;
}
