import { useEffect, useSyncExternalStore } from 'react';
import { useSession } from '@/features/session/session-provider';
import { opinionReactions } from '@/services/opinion-reactions';
import { getPostReadRevision } from '@/services/post-observation';
import { getAuthRevision } from '@/services/basic-auth';
import type { PublicPostDto } from '@/types/api';
import type { Membership } from '@/types/core';
import type { OpinionReaction } from '@/types/opinion-reaction';

const serverVersion = () => 0;
export function useOpinionReaction(post: PublicPostDto, membership: Membership | null | undefined, closed: boolean) {
  const { profile, revision } = useSession();
  useSyncExternalStore(opinionReactions.subscribe, opinionReactions.getVersion, serverVersion);
  const target = { debateId: post.debateId, postId: post.postId, parentId: post.parentId };
  const access = { signedIn: !!profile, participant: !!membership, own: !!membership && membership.anonymousNo === post.anonymousNo, closed };
  useEffect(() => {
    opinionReactions.observe({ debateId: post.debateId, postId: post.postId, parentId: post.parentId }, { upvoteCount: post.upvoteCount, downvoteCount: post.downvoteCount }, getPostReadRevision(post));
  }, [post, revision]);
  const state = opinionReactions.get(target);
  const blockReason = opinionReactions.blockReason(target, access);
  // 실제 동작은 컨트롤러가 동일 글의 모든 화면에 공통 잠금을 즉시 적용합니다.
  const press = (vote: OpinionReaction) => { if (revision === getAuthRevision()) void opinionReactions.press(target, vote, access); };
  const retry = () => { if (revision === getAuthRevision()) void opinionReactions.retry(target, access); };
  const cancel = () => { if (revision === getAuthRevision()) void opinionReactions.cancel(target, access); };
  return { state, access, blockReason, press, retry, cancel,
    canVote: !blockReason && !state.pending && !state.retry && !state.blocked,
    closed: closed || opinionReactions.isClosed(post.debateId) };
}
