import { apiRequest, ApiError } from './api-client.ts';
import { count, id, invalidResponse, nextCursor, record, routeId, string, timestamp } from './api-values.ts';
import { stance } from './http-models.ts';
import type { CreateDebateInput } from '../types/core';

// PR #8/#9의 공개 요약 구현을 공통으로 사용합니다. 기존 호출 이름은 호환을 위해 유지합니다.
export { parsePublicSummary as parseSummary, getPublicSummary as getServerSummary } from './public-debate-api.ts';

export type StanceEvent = { id: string; fromStance: 'PRO' | 'CON' | 'NEUTRAL'; toStance: 'PRO' | 'CON' | 'NEUTRAL'; changedAt: string; persuasionId: string | null };
export type NotificationItem = { id: string; type: string; title: string; body: string | null; targetType: string | null; targetId: string | null; isRead: boolean; createdAt: string };
export type NotificationPage = { items: NotificationItem[]; unreadCount: number; nextCursor: string | null };
export type DraftDto = { id: string; categoryId: string; kind: 'QUICK' | 'ENDLESS'; title: string; content: string; durationMinutes: number | null; createdAt: string };
export type ServerTiming = { debateId: string; status: 'OPEN' | 'CLOSED' | 'CANCELED'; serverTime: string; endsAt: string | null; remainingSeconds: number | null; isReadOnly: boolean };
export type ClockSample = ServerTiming & { monotonicAt: number; halfRoundTripMs: number };
export const monotonicNow = () => typeof performance !== 'undefined' ? performance.now() : Date.now();

export function parseEvents(value: unknown): StanceEvent[] {
  const data = record(record(value).data);
  if (!Array.isArray(data.events)) invalidResponse();
  return data.events.map((value) => { const row = record(value); return { id: id(row.id), fromStance: stance(row.fromStance), toStance: stance(row.toStance), changedAt: timestamp(row.changedAt), persuasionId: row.persuasionId === null ? null : id(row.persuasionId) }; });
}
export async function getStanceEvents(debateId: string, signal?: AbortSignal) {
  return parseEvents(await apiRequest<unknown>(`/v1/debates/${routeId(debateId)}/me/events`, { auth: 'required', signal }));
}
export function parseNotifications(value: unknown): NotificationPage {
  const envelope = record(value); const data = record(envelope.data);
  if (!Array.isArray(data.notifications)) invalidResponse();
  return { items: data.notifications.map((value) => {
    const row = record(value); if (typeof row.isRead !== 'boolean') invalidResponse();
    return { id: id(row.notificationId), type: string(row.type), title: string(row.title), body: row.body === null ? null : string(row.body),
      targetType: row.targetType === null ? null : string(row.targetType), targetId: row.targetId === null ? null : id(row.targetId), isRead: row.isRead, createdAt: timestamp(row.createdAt) };
  }), unreadCount: count(data.unreadCount), nextCursor: nextCursor(record(envelope.meta).nextCursor) };
}
export async function getNotifications(query: { unreadOnly?: boolean; cursor?: string } = {}, signal?: AbortSignal) {
  const search = new URLSearchParams({ unreadOnly: query.unreadOnly ? 'true' : 'false' });
  if (query.cursor) search.set('cursor', query.cursor);
  return parseNotifications(await apiRequest<unknown>(`/v1/me/notifications?${search}`, { auth: 'required', signal }));
}
export function appendNotifications(items: NotificationItem[], page: NotificationPage, requested: string[]) {
  if (page.nextCursor !== null && requested.includes(page.nextCursor)) invalidResponse();
  return [...new Map([...items, ...page.items].map((item) => [item.id, item])).values()];
}

function zonedTime(value: unknown): string {
  const text = string(value);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(text) || !Number.isFinite(Date.parse(text))) invalidResponse();
  return new Date(text).toISOString();
}
export function parseTiming(value: unknown, expectedId: string): ServerTiming {
  const data = record(value);
  let debateId: string;
  // timing은 아직 숫자 ID를 반환합니다. 이미 정밀도를 잃은 큰 숫자는 복구했다고 가정하지 않습니다.
  if (typeof data.debateId === 'number') { if (!Number.isSafeInteger(data.debateId)) invalidResponse(); debateId = id(String(data.debateId)); }
  else debateId = id(data.debateId);
  if (debateId !== expectedId || !['OPEN', 'CLOSED', 'CANCELED'].includes(string(data.status)) || typeof data.isReadOnly !== 'boolean') invalidResponse();
  const status = data.status as ServerTiming['status'];
  if (data.isReadOnly !== (status !== 'OPEN')) invalidResponse();
  return { debateId, status, serverTime: zonedTime(data.serverTime), endsAt: data.endsAt === null ? null : zonedTime(data.endsAt),
    remainingSeconds: data.remainingSeconds === null ? null : count(data.remainingSeconds), isReadOnly: data.isReadOnly };
}
export async function getServerTiming(debateId: string, signal?: AbortSignal): Promise<ClockSample> {
  const key = routeId(debateId); const start = monotonicNow();
  const timing = parseTiming(await apiRequest<unknown>(`/v1/debates/${key}/timing`, { auth: 'public', signal }), key);
  const received = monotonicNow();
  return { ...timing, monotonicAt: received, halfRoundTripMs: Math.max(0, received - start) / 2 };
}
export function serverClockState(sample: ClockSample, now = monotonicNow()) {
  const serverNow = Date.parse(sample.serverTime) + sample.halfRoundTripMs + Math.max(0, now - sample.monotonicAt);
  const remainingSeconds = sample.endsAt === null ? null : Math.max(0, Math.ceil((Date.parse(sample.endsAt) - serverNow) / 1000));
  return { serverNow, remainingSeconds, isReadOnly: sample.isReadOnly || remainingSeconds === 0 };
}

export function parseDraft(value: unknown): DraftDto {
  const row = record(value);
  if (row.status !== 'DRAFT' || !['QUICK', 'ENDLESS'].includes(string(row.kind))) throw new ApiError(409, 'NOT_DRAFT', '게시 전 초안만 수정할 수 있습니다.');
  const duration = row.durationMinutes === null ? null : count(row.durationMinutes);
  if ((row.kind === 'QUICK' && (duration === null || duration < 5 || duration > 15)) || (row.kind === 'ENDLESS' && duration !== null)) invalidResponse();
  return { id: id(row.debateId), categoryId: id(row.categoryId), kind: row.kind as DraftDto['kind'], title: string(row.title), content: string(row.content), durationMinutes: duration, createdAt: timestamp(row.createdAt) };
}
export async function fetchDraft(draftId: string): Promise<DraftDto> {
  const key = routeId(draftId); const data = record(record(await apiRequest<unknown>(`/v1/debates/${key}`, { auth: 'required' })).data);
  const row = record(data.debate); const category = record(row.category);
  const draft = parseDraft({ ...row, debateId: row.id, categoryId: category.id });
  if (draft.id !== key) invalidResponse(); return draft;
}
export async function patchDraft(draftId: string, body: { categoryId: string; kind: CreateDebateInput['kind']; title: string; content: string; durationMinutes: number | null }): Promise<DraftDto> {
  const key = routeId(draftId);
  const data = record(record(await apiRequest<unknown>(`/v1/debates/${key}`, { auth: 'required', method: 'PATCH', body })).data);
  const draft = parseDraft(data.draft); if (draft.id !== key || draft.categoryId !== body.categoryId) invalidResponse(); return draft;
}
