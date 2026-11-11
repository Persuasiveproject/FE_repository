import { apiRequest } from './api-client';
import type { JoinedDebatesQuery, JoinedDebatesResponse } from '../types/api';

// 개인 참여 목록 요청입니다. 메모리 인증정보가 없으면 AUTH_REQUIRED로 차단합니다.
export function getJoinedDebates(query: JoinedDebatesQuery = {}, signal?: AbortSignal) {
  const search = new URLSearchParams();
  if (query.status) search.set('status', query.status);
  if (query.cursor) search.set('cursor', query.cursor);
  const suffix = search.size ? `?${search}` : '';
  return apiRequest<JoinedDebatesResponse>(`/v1/me/debates${suffix}`, { auth: 'required', signal });
}
