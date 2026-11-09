import { apiRequest } from './api-client.ts';
import { count, id, invalidResponse, nextCursor, nullableTime, record, string, timestamp } from './api-values.ts';
import type { CategoriesResponse, CategoryDto, PublicDebateDto, PublicDebatesQuery, PublicDebatesResponse } from '../types/api';
import type { Discussion } from '../types/discussion';

export function parseCategories(value: unknown): CategoriesResponse {
  const data = record(record(value).data);
  if (!Array.isArray(data.categories)) invalidResponse();
  const categories = data.categories.map((entry): CategoryDto => {
    const item = record(entry);
    return { id: id(item.id), name: string(item.name), sortOrder: count(item.sortOrder) };
  });
  return { data: { categories } };
}
export function parsePublicDebateItems(value: unknown): PublicDebateDto[] {
  if (!Array.isArray(value)) invalidResponse();
  return value.map((entry): PublicDebateDto => {
    const item = record(entry);
    if (item.kind !== 'QUICK' && item.kind !== 'ENDLESS') invalidResponse();
    if (item.status !== 'OPEN' && item.status !== 'CLOSED') invalidResponse();
    return {
      id: id(item.id), kind: item.kind, title: string(item.title), status: item.status,
      createdAt: timestamp(item.createdAt), categoryId: id(item.categoryId),
      participantCount: count(item.participantCount), opinionCount: count(item.opinionCount), viewCount: count(item.viewCount),
      startedAt: nullableTime(item.startedAt), endsAt: nullableTime(item.endsAt),
      closedAt: nullableTime(item.closedAt), canceledAt: nullableTime(item.canceledAt),
    };
  });
}
export function parsePublicDebates(value: unknown): PublicDebatesResponse {
  const envelope = record(value);
  const data = record(envelope.data);
  const meta = record(envelope.meta);
  return { data: { debates: parsePublicDebateItems(data.debates) }, meta: { nextCursor: nextCursor(meta.nextCursor) } };
}

export async function getPublicCategories(signal?: AbortSignal): Promise<CategoryDto[]> {
  const response = await apiRequest<unknown>('/v1/categories', { auth: 'public', signal });
  return parseCategories(response).data.categories;
}
export async function getPublicDebates(query: PublicDebatesQuery = {}, signal?: AbortSignal): Promise<PublicDebatesResponse> {
  const search = new URLSearchParams({ sort: 'latest' });
  if (query.query?.trim()) search.set('query', query.query.trim());
  if (query.categoryId) search.set('categoryId', query.categoryId);
  if (query.status) search.set('status', query.status);
  if (query.cursor) search.set('cursor', query.cursor);
  const response = await apiRequest<unknown>(`/v1/debates?${search}`, { auth: 'public', signal });
  return parsePublicDebates(response);
}

export function toDiscussion(item: PublicDebateDto, categories: CategoryDto[]): Discussion {
  return {
    id: item.id,
    category: categories.find((category) => category.id === item.categoryId)?.name ?? '분류 미확인',
    title: item.title,
    // #15에는 본문 요약이 없습니다. 설명이나 현재 입장을 예시 값으로 채우지 않습니다.
    description: '', participants: item.participantCount, opinionCount: item.opinionCount,
    kind: item.kind === 'QUICK' ? '간단토론' : '끝장토론', status: item.status,
  };
}

export function appendDebatePage(items: PublicDebateDto[], page: PublicDebatesResponse, requestedCursors: string[]): PublicDebateDto[] {
  if (page.meta.nextCursor !== null && requestedCursors.includes(page.meta.nextCursor)) invalidResponse();
  // 페이지 사이에 항목이 겹쳐도 카드/React key가 중복되지 않게 최신 응답으로 갱신합니다.
  return [...new Map([...items, ...page.data.debates].map((item) => [item.id, item])).values()];
}
