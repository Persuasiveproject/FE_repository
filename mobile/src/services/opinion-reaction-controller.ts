import { ApiError } from './api-client.ts';
import { nextPostRevision } from './post-observation.ts';
import type { OpinionReaction, OpinionReactionResult, ReactionAccess, ReactionCounts, ReactionTarget } from '../types/opinion-reaction';

type Intent = OpinionReaction | null;
type Retry = { intent: Intent; phase: 'write' | 'counts' };
export type ReactionSnapshot = Readonly<{
  reaction: OpinionReaction | null | 'UNKNOWN'; counts: ReactionCounts | null; countsVersion: number;
  pending: boolean; countsUnavailable: boolean; error: string; retry: Retry | null; blocked: boolean;
}>;
const EMPTY: ReactionSnapshot = Object.freeze({ reaction: 'UNKNOWN', counts: null, countsVersion: -1, pending: false, countsUnavailable: false, error: '', retry: null, blocked: false });
type Transport = {
  enabled: () => boolean;
  put: (postId: string, reaction: OpinionReaction) => Promise<OpinionReactionResult>;
  remove: (postId: string) => Promise<void>;
  readCounts: (target: ReactionTarget) => Promise<ReactionCounts>;
};
export function reactionBlockReason(access: ReactionAccess, enabled: boolean): string {
  if (!enabled) return '공감·비공감 기능은 서버 연결 준비 중입니다.';
  if (!access.signedIn) return '로그인한 뒤 공감·비공감을 남겨 주세요.';
  if (!access.participant) return '토론에 참여한 뒤 공감·비공감을 남겨 주세요.';
  if (access.own) return '내 글에는 공감·비공감을 남길 수 없습니다.';
  if (access.closed) return '마감된 토론에서는 반응을 변경할 수 없습니다.';
  return '';
}
function canRetry(error: unknown) {
  return !(error instanceof ApiError) || (error.status === 0 && !['REACTIONS_NOT_ENABLED', 'SESSION_CHANGED', 'INVALID_ID', 'INVALID_REACTION', 'AUTH_SERVER_CHANGED', 'HTTPS_REQUIRED'].includes(error.code))
    || error.status >= 500 || error.status === 408 || error.status === 429 || (error.status === 200 && error.code === 'INVALID_RESPONSE');
}

// 같은 글을 목록·펼친 답글·전체 답글 화면에서 보더라도 요청과 선택 상태를 공유합니다.
export function createReactionController(transport: Transport) {
  const states = new Map<string, ReactionSnapshot>();
  const closedDebates = new Set<string>();
  const listeners = new Set<() => void>();
  let epoch = 0; let version = 0;
  const key = (target: ReactionTarget) => `${target.debateId}/${target.postId}`;
  const get = (target: ReactionTarget) => states.get(key(target)) ?? EMPTY;
  function notify() { version++; for (const listener of listeners) listener(); }
  function update(target: ReactionTarget, patch: Partial<ReactionSnapshot>) { states.set(key(target), Object.freeze({ ...get(target), ...patch })); notify(); }
  function blockedReason(target: ReactionTarget, access: ReactionAccess) {
    return reactionBlockReason({ ...access, closed: access.closed || closedDebates.has(target.debateId) }, transport.enabled());
  }
  async function execute(target: ReactionTarget, intent: Intent, phase: Retry['phase'], access: ReactionAccess): Promise<boolean> {
    if (get(target).pending) return false;
    const reason = phase === 'counts' ? (!transport.enabled() ? reactionBlockReason(access, false) : !access.signedIn ? '다시 로그인해 주세요.' : '') : blockedReason(target, access);
    if (reason) { update(target, { error: reason }); return false; }
    const startedEpoch = epoch;
    update(target, { pending: true, error: '', retry: null });
    let currentPhase = phase;
    try {
      if (phase === 'write' && intent !== null) {
        const result = await transport.put(target.postId, intent);
        if (startedEpoch !== epoch) return false;
        update(target, { reaction: result.reaction, counts: { upvoteCount: result.upvoteCount, downvoteCount: result.downvoteCount }, countsVersion: nextPostRevision(), countsUnavailable: false });
      } else {
        if (phase === 'write') {
          await transport.remove(target.postId);
          if (startedEpoch !== epoch) return false;
          update(target, { reaction: null, countsUnavailable: true, countsVersion: nextPostRevision() });
        }
        // 204 취소 후에는 숫자를 빼서 추정하지 않고 실제 서버 표수를 다시 읽습니다.
        currentPhase = 'counts';
        const counts = await transport.readCounts(target);
        if (startedEpoch !== epoch) return false;
        update(target, { counts, countsVersion: nextPostRevision(), countsUnavailable: false });
      }
      return true;
    } catch (error) {
      if (startedEpoch !== epoch) return false;
      const retryWrite = currentPhase === 'write' && canRetry(error);
      const retry = retryWrite ? { intent, phase: 'write' as const }
        : currentPhase === 'counts' || get(target).countsUnavailable ? { intent: null, phase: 'counts' as const } : null;
      const uncertain = retryWrite;
      if (error instanceof ApiError && error.code === 'DEBATE_NOT_OPEN') closedDebates.add(target.debateId);
      update(target, { error: error instanceof Error ? error.message : '반응을 처리하지 못했습니다.', retry,
        ...(uncertain ? { reaction: 'UNKNOWN', countsUnavailable: true } : {}),
        blocked: error instanceof ApiError && (['OWN_POST_REACTION', 'POST_NOT_FOUND'].includes(error.code) || error.status === 404 || error.status === 405) });
      return false;
    } finally { if (startedEpoch === epoch) update(target, { pending: false }); }
  }
  return {
    get,
    getVersion: () => version,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    isClosed: (debateId: string) => closedDebates.has(debateId),
    blockReason: blockedReason,
    observe(target: ReactionTarget, counts: ReactionCounts, readRevision: number) {
      // 읽기만 한 모든 의견을 별도 캐시에 쌓지 않습니다. 처음에는 화면의 목록 DTO를 사용합니다.
      if (!states.has(key(target))) return;
      const current = get(target);
      if (!current.pending && !current.retry && readRevision > current.countsVersion) update(target, { counts, countsVersion: readRevision, countsUnavailable: false });
    },
    press(target: ReactionTarget, vote: OpinionReaction, access: ReactionAccess) {
      const current = get(target);
      if (current.pending || current.retry || current.blocked) return Promise.resolve(false);
      return execute(target, current.reaction === vote ? null : vote, 'write', access);
    },
    cancel(target: ReactionTarget, access: ReactionAccess) {
      const current = get(target);
      if (current.pending || current.retry || current.blocked) return Promise.resolve(false);
      return execute(target, null, 'write', access);
    },
    retry(target: ReactionTarget, access: ReactionAccess) {
      const pending = get(target).retry;
      return pending ? execute(target, pending.intent, pending.phase, access) : Promise.resolve(false);
    },
    reset() { epoch++; states.clear(); closedDebates.clear(); notify(); },
  };
}
