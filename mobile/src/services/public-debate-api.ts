import { apiRequest, ApiError } from './api-client.ts';
import { count, id, invalidResponse, nextCursor, nullableTime, record, routeId, string, timestamp } from './api-values.ts';
import { getPublicCategories, parsePublicDebateItems, toDiscussion } from './public-api.ts';
import type { PublicDetailDto, PublicHomeDto, PublicPostDto, PublicPostPage, PublicPostQuery } from '../types/api';
import type { OpinionCardData, Summary } from '../types/core';
import type { HomeFeed } from '../types/discussion';

export function parsePublicHome(value: unknown): PublicHomeDto {
  const data = record(record(value).data);
  return { popularDebates: parsePublicDebateItems(data.popularDebates), recommendedDebates: parsePublicDebateItems(data.recommendedDebates) };
}
export async function getPublicHomeFeed(signal?: AbortSignal): Promise<HomeFeed> {
  const [response, categories] = await Promise.all([
    apiRequest<unknown>('/v1/home', { auth: 'public', signal }), getPublicCategories(signal),
  ]);
  const data = parsePublicHome(response);
  return { popular: data.popularDebates.map((item) => toDiscussion(item, categories)), recommended: data.recommendedDebates.map((item) => toDiscussion(item, categories)) };
}

export function parsePublicDetail(value: unknown): PublicDetailDto {
  const data = record(record(value).data);
  const item = record(data.debate);
  const category = record(item.category);
  if (item.kind !== 'QUICK' && item.kind !== 'ENDLESS') invalidResponse();
  if (item.status !== 'OPEN' && item.status !== 'CLOSED') invalidResponse();
  const participants = count(item.participantCount);
  if (count(data.participantCount) !== participants) invalidResponse();
  return {
    id: id(item.id), kind: item.kind, title: string(item.title), content: string(item.content), status: item.status,
    category: { id: id(category.id), name: string(category.name), sortOrder: count(category.sortOrder) },
    createdAt: timestamp(item.createdAt), startedAt: nullableTime(item.startedAt), endsAt: nullableTime(item.endsAt),
    closedAt: nullableTime(item.closedAt), canceledAt: nullableTime(item.canceledAt), participantCount: participants,
    durationMinutes: item.durationMinutes === null ? null : count(item.durationMinutes),
  };
}

function parsePost(value: unknown): PublicPostDto {
  const item = record(value);
  if (!['PRO', 'CON', 'NEUTRAL'].includes(string(item.stanceAtWrite)) || item.status !== 'VISIBLE') invalidResponse();
  const anonymousNo = count(item.anonymousNo);
  if (anonymousNo === 0) invalidResponse();
  return {
    postId: id(item.postId), debateId: id(item.debateId), parentId: item.parentId === null ? null : id(item.parentId),
    rootId: item.rootId === null ? null : id(item.rootId), stanceAtWrite: item.stanceAtWrite as PublicPostDto['stanceAtWrite'],
    status: 'VISIBLE', anonymousNo, content: string(item.content), createdAt: timestamp(item.createdAt), updatedAt: timestamp(item.updatedAt),
    upvoteCount: count(item.upvoteCount), downvoteCount: count(item.downvoteCount), persuasionCount: count(item.persuasionCount), replyCount: count(item.replyCount),
  };
}
export function parsePublicPosts(value: unknown, debateId: string, parentId?: string): PublicPostPage {
  const envelope = record(value);
  const data = record(envelope.data);
  const entries = data[parentId === undefined ? 'posts' : 'replies'];
  if (!Array.isArray(entries)) invalidResponse();
  const items = entries.map(parsePost);
  // 다른 토론/부모의 글이 섞인 응답을 현재 화면에 표시하지 않습니다.
  if (items.some((item) => item.debateId !== debateId || item.parentId !== (parentId ?? null))) invalidResponse();
  return { items, nextCursor: nextCursor(record(envelope.meta).nextCursor) };
}

// 전체 글을 다시 훑지 않고 방금 목록에서 본 원문을 전체 답글 화면에도 표시합니다.
// #31은 replies만 반환합니다. 직접 주소를 열어 캐시가 없으면 원문을 만들어 표시하지 않습니다.
const recentPosts = new Map<string, PublicPostDto>();
function rememberPosts(items: PublicPostDto[]) {
  for (const item of items) {
    recentPosts.delete(item.postId); recentPosts.set(item.postId, item);
    if (recentPosts.size > 200) recentPosts.delete(recentPosts.keys().next().value!);
  }
}
export function getRecentPublicPost(debateId: string, postId: string): PublicPostDto | undefined {
  const item = recentPosts.get(postId);
  return item?.debateId === debateId ? item : undefined;
}
export function toOpinionCard(item: PublicPostDto): OpinionCardData {
  return {
    id: item.postId, authorName: `익명 ${item.anonymousNo}`, stance: item.stanceAtWrite, content: item.content,
    createdAt: item.createdAt, upvotes: item.upvoteCount, downvotes: item.downvoteCount, replyCount: item.replyCount,
  };
}
function readError(error: unknown): never {
  if (error instanceof ApiError) {
    const message: Record<string, string> = {
      DEBATE_NOT_FOUND: '토론을 찾을 수 없습니다.', POST_NOT_FOUND: '의견을 찾을 수 없습니다.',
      DRAFT_NOT_ACCESSIBLE: '공개되지 않은 토론입니다.', CURSOR_INVALID: '목록이 변경되었습니다. 다시 불러와 주세요.',
    };
    if (message[error.code]) throw new ApiError(error.status, error.code, message[error.code], error.details);
  }
  throw error;
}
export async function getPublicDetail(debateId: string, signal?: AbortSignal): Promise<PublicDetailDto> {
  const key = routeId(debateId);
  try {
    const item = parsePublicDetail(await apiRequest<unknown>(`/v1/debates/${key}`, { auth: 'public', signal }));
    if (item.id !== key) invalidResponse();
    return item;
  } catch (error) { return readError(error); }
}
export async function getPublicPosts(debateId: string, query: PublicPostQuery = {}, signal?: AbortSignal): Promise<PublicPostPage> {
  const key = routeId(debateId);
  const search = new URLSearchParams({ sort: query.sort ?? 'latest' });
  if (query.stance) search.set('stance', query.stance);
  if (query.cursor) search.set('cursor', query.cursor);
  try {
    const page = parsePublicPosts(await apiRequest<unknown>(`/v1/debates/${key}/posts?${search}`, { auth: 'public', signal }), key);
    rememberPosts(page.items); return page;
  } catch (error) { return readError(error); }
}
export async function getPublicThread(debateId: string, parentId: string, cursor?: string, signal?: AbortSignal): Promise<PublicPostPage> {
  const debate = routeId(debateId); const parent = routeId(parentId);
  const search = new URLSearchParams();
  if (cursor) search.set('cursor', cursor);
  try {
    const page = parsePublicPosts(await apiRequest<unknown>(`/v1/posts/${parent}/thread${search.size ? `?${search}` : ''}`, { auth: 'public', signal }), debate, parent);
    rememberPosts(page.items); return page;
  } catch (error) { return readError(error); }
}
export function appendPostPage(items: PublicPostDto[], page: PublicPostPage, requested: string[]): PublicPostDto[] {
  if (page.nextCursor !== null && requested.includes(page.nextCursor)) invalidResponse();
  return [...new Map([...items, ...page.items].map((item) => [item.postId, item])).values()];
}

// API 43: PRO/CON별 최신 AI 요약. 요약이 아직 없으면 sections가 빈 배열이다.
const summaryTitles = { PRO: '찬성 핵심 근거', CON: '반대 핵심 근거' } as const;
export function parsePublicSummary(value: unknown): Summary {
  const data = record(record(value).data);
  if (!Array.isArray(data.summaries)) invalidResponse();
  const sections = data.summaries.map((entry) => {
    const item = record(entry);
    if (item.stance !== 'PRO' && item.stance !== 'CON') invalidResponse();
    if (!Array.isArray(item.sourcePostIds)) invalidResponse();
    return {
      stance: item.stance as 'PRO' | 'CON', createdAt: timestamp(item.createdAt),
      title: summaryTitles[item.stance as 'PRO' | 'CON'], text: string(item.summaryText),
      opinionIds: item.sourcePostIds.map(id),
    };
  });
  if (new Set(sections.map((s) => s.stance)).size !== sections.length) invalidResponse();
  const generatedAt = sections.map((s) => s.createdAt).sort().at(-1) ?? null;
  return { generatedAt, sections: sections.map(({ title, text, opinionIds }) => ({ title, text, opinionIds })) };
}
export async function getPublicSummary(debateId: string, signal?: AbortSignal): Promise<Summary> {
  const key = routeId(debateId);
  try { return parsePublicSummary(await apiRequest<unknown>(`/v1/debates/${key}/summary`, { auth: 'public', signal })); }
  catch (error) { return readError(error); }
}
