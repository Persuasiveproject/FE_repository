import { apiRequest, ApiError } from './api-client.ts';
import { count, invalidResponse, record, routeId } from './api-values.ts';
import { getAuthRevision } from './basic-auth.ts';
import { getPublicPosts, getPublicThread } from './public-debate-api.ts';
import type { OpinionReaction, OpinionReactionResult, ReactionCounts, ReactionTarget } from '../types/opinion-reaction';

// 미병합 PR의 배포를 가정하지 않습니다. 배포 계약 확인 후 실행 환경에서 명시적으로 켭니다.
export const opinionReactionsEnabled = () => process.env.EXPO_PUBLIC_OPINION_REACTIONS_ENABLED === 'true';
function requireEnabled() {
  if (!opinionReactionsEnabled()) throw new ApiError(0, 'REACTIONS_NOT_ENABLED', '공감·비공감 기능은 서버 연결 준비 중입니다.');
}
export function parseOpinionReaction(value: unknown, expected: OpinionReaction): OpinionReactionResult {
  const data = record(record(value).data);
  if ((data.reaction !== 'UP' && data.reaction !== 'DOWN') || data.reaction !== expected) invalidResponse();
  return { reaction: data.reaction, upvoteCount: count(data.upvoteCount), downvoteCount: count(data.downvoteCount) };
}
export function reactionError(error: unknown): Error {
  if (!(error instanceof ApiError)) return new ApiError(0, 'NETWORK_ERROR', '응답을 끝까지 확인하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.');
  const messages: Record<string, string> = {
    OWN_POST_REACTION: '내 글에는 공감·비공감을 남길 수 없습니다.',
    NOT_PARTICIPANT: '토론에 참여한 뒤 공감·비공감을 남겨 주세요.',
    DEBATE_NOT_OPEN: '마감된 토론에서는 반응을 등록·변경·취소할 수 없습니다.',
    POST_NOT_FOUND: '의견이 삭제되었거나 더 이상 공개되지 않습니다.',
    AUTH_REQUIRED: '로그인한 뒤 다시 시도해 주세요.', AUTHENTICATION_REQUIRED: '로그인한 뒤 다시 시도해 주세요.',
    FORBIDDEN: '이 계정은 반응을 남길 권한이 없습니다.',
    VALIDATION_ERROR: '반응 요청을 확인하지 못했습니다. 화면을 다시 불러와 주세요.',
    NETWORK_ERROR: '서버 연결을 확인한 뒤 다시 시도해 주세요. 이전 요청의 결과는 아직 확인되지 않았습니다.',
  };
  const message = messages[error.code] ?? ((error.status === 404 || error.status === 405)
    ? '반응 API 경로를 확인하지 못했습니다. 서버 배포 상태를 확인해 주세요.'
    : error.status >= 500 ? '서버에서 반응을 처리하지 못했습니다. 잠시 후 같은 요청으로 다시 시도해 주세요.' : error.message);
  return new ApiError(error.status, error.code, message, error.details);
}
export async function putOpinionReaction(postId: string, reaction: OpinionReaction, signal?: AbortSignal): Promise<OpinionReactionResult> {
  requireEnabled();
  if (reaction !== 'UP' && reaction !== 'DOWN') throw new ApiError(0, 'INVALID_REACTION', '공감 또는 비공감을 선택해 주세요.');
  try {
    return parseOpinionReaction(await apiRequest<unknown>(`/v1/posts/${routeId(postId)}/reaction`, { auth: 'required', method: 'PUT', body: { reaction }, signal }), reaction);
  } catch (error) { throw reactionError(error); }
}
export async function deleteOpinionReaction(postId: string, signal?: AbortSignal): Promise<void> {
  requireEnabled();
  try {
    // DELETE는 204이며 표수나 reaction=null을 반환하지 않습니다.
    const value = await apiRequest<unknown>(`/v1/posts/${routeId(postId)}/reaction`, { auth: 'required', method: 'DELETE', signal });
    if (value !== undefined) invalidResponse();
  } catch (error) { throw reactionError(error); }
}
export async function readOpinionReactionCounts(target: ReactionTarget, signal?: AbortSignal): Promise<ReactionCounts> {
  const revision = getAuthRevision();
  const debateId = routeId(target.debateId); const postId = routeId(target.postId);
  const parentId = target.parentId === null ? null : routeId(target.parentId);
  const seen = new Set<string>(); let cursor: string | undefined;
  // 단일 원문 GET이 없으므로 실제 목록/직계 답글을 최신순으로 탐색합니다. 무한 조회는 막습니다.
  for (let pageIndex = 0; pageIndex < 50; pageIndex++) {
    if (revision !== getAuthRevision()) throw new ApiError(0, 'SESSION_CHANGED', '계정이 변경되었습니다.');
    let page;
    try { page = parentId === null ? await getPublicPosts(debateId, { sort: 'latest', cursor }, signal) : await getPublicThread(debateId, parentId, cursor, signal); }
    catch (error) { throw reactionError(error); }
    if (revision !== getAuthRevision()) throw new ApiError(0, 'SESSION_CHANGED', '계정이 변경되었습니다.');
    const post = page.items.find((item) => item.postId === postId);
    if (post) return { upvoteCount: post.upvoteCount, downvoteCount: post.downvoteCount };
    if (page.nextCursor === null) break;
    if (seen.has(page.nextCursor)) invalidResponse();
    seen.add(page.nextCursor); cursor = page.nextCursor;
  }
  throw new ApiError(0, 'REACTION_COUNTS_UNAVAILABLE', '반응 취소 후 최신 표수를 찾지 못했습니다. 표수 다시 확인을 눌러 주세요.');
}
