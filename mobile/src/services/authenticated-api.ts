import { apiRequest, ApiError } from './api-client.ts';
import { count, id, invalidResponse, record, routeId, string, timestamp } from './api-values.ts';
import type {
  BadgeAwardDto, CreateDebateRequest, CreateDebateResponse, CreateOpinionRequest, CreateOpinionResponse,
  CreatedReferenceDto, SelectStanceRequest, SelectStanceResponse, UserProfileDto,
} from '../types/api';

function parseCategory(value: unknown) {
  const item = record(value);
  return { id: id(item.id), name: string(item.name), sortOrder: count(item.sortOrder) };
}

function parseBadge(value: unknown): BadgeAwardDto {
  const item = record(value);
  return { id: id(item.id) };
}

export function parseMyProfile(value: unknown): UserProfileDto {
  const item = record(record(value).data);
  if (!Array.isArray(item.interests) || !Array.isArray(item.badges) || typeof item.identityVerified !== 'boolean') invalidResponse();
  return {
    id: id(item.id), nickname: string(item.nickname), coinBalance: count(item.coinBalance),
    credit: string(item.credit), identityVerified: item.identityVerified,
    interests: item.interests.map(parseCategory), badges: item.badges.map(parseBadge),
  };
}

export async function getMyProfile(accessToken: string, signal?: AbortSignal): Promise<UserProfileDto> {
  return parseMyProfile(await apiRequest<unknown>('/v1/me', { auth: 'required', accessToken, signal }));
}

function parseCreatedDebate(value: unknown): CreateDebateResponse {
  const data = record(record(value).data);
  if (data.status !== 'DRAFT') invalidResponse();
  return { data: { debateId: id(data.debateId), status: 'DRAFT', createdAt: timestamp(data.createdAt) } };
}

export async function createDebate(accessToken: string, input: CreateDebateRequest, signal?: AbortSignal): Promise<CreateDebateResponse> {
  const response = await apiRequest<unknown>('/v1/debates', { auth: 'required', accessToken, method: 'POST', body: input, signal });
  return parseCreatedDebate(response);
}

function parseStanceResult(value: unknown): SelectStanceResponse {
  const data = record(record(value).data);
  if (!['PRO', 'CON', 'NEUTRAL'].includes(string(data.currentStance))) invalidResponse();
  return { data: { currentStance: data.currentStance as SelectStanceResponse['data']['currentStance'], eventId: id(data.eventId),
    persuasionId: data.persuasionId === null ? null : id(data.persuasionId), reward: data.reward ?? null } };
}

export async function selectDebateStance(
  accessToken: string, debateId: string, input: SelectStanceRequest, idempotencyKey: string, signal?: AbortSignal,
): Promise<SelectStanceResponse> {
  const key = routeId(debateId);
  if (!idempotencyKey || idempotencyKey.length > 128) throw new ApiError(0, 'IDEMPOTENCY_KEY_INVALID', 'Idempotency-Key는 1~128자여야 합니다.');
  const response = await apiRequest<unknown>(`/v1/debates/${key}/me/stance`, {
    auth: 'required', accessToken, method: 'PATCH', body: input, idempotencyKey, signal,
  });
  return parseStanceResult(response);
}

function parseCreatedReference(value: unknown): CreatedReferenceDto {
  const item = record(value);
  if (!['PENDING', 'SAFE', 'UNSAFE'].includes(string(item.status))) invalidResponse();
  return { referenceId: id(item.referenceId), status: item.status as CreatedReferenceDto['status'], url: item.url === null ? null : string(item.url) };
}

function parseCreatedOpinion(value: unknown): CreateOpinionResponse {
  const data = record(record(value).data);
  if (!['PRO', 'CON', 'NEUTRAL'].includes(string(data.stanceAtWrite)) || !['VISIBLE', 'FILTERED', 'DELETED'].includes(string(data.status)) || !Array.isArray(data.references)) invalidResponse();
  return { data: { postId: id(data.postId), stanceAtWrite: data.stanceAtWrite as CreateOpinionResponse['data']['stanceAtWrite'],
    status: data.status as CreateOpinionResponse['data']['status'], createdAt: timestamp(data.createdAt), references: data.references.map(parseCreatedReference) } };
}

export async function createOpinion(
  accessToken: string, debateId: string, input: CreateOpinionRequest, idempotencyKey: string, signal?: AbortSignal,
): Promise<CreateOpinionResponse> {
  const key = routeId(debateId);
  if (!idempotencyKey || idempotencyKey.length > 128) throw new ApiError(0, 'IDEMPOTENCY_KEY_INVALID', 'Idempotency-Key는 1~128자여야 합니다.');
  const response = await apiRequest<unknown>(`/v1/debates/${key}/posts`, {
    auth: 'required', accessToken, method: 'POST', body: input, idempotencyKey, signal,
  });
  return parseCreatedOpinion(response);
}
