import { apiRequest } from './api-client';
import type { JoinedDebatesQuery, JoinedDebatesResponse } from '../types/api';

// 존재하는 경로만 선언합니다. 현재 auth 가드로 차단되며 홈에는 연결하지 않습니다.
export function getJoinedDebates(query: JoinedDebatesQuery = {}, signal?: AbortSignal) {
  const search = new URLSearchParams();
  if (query.status) search.set('status', query.status);
  if (query.cursor) search.set('cursor', query.cursor);
  const suffix = search.size ? `?${search}` : '';
  return apiRequest<JoinedDebatesResponse>(`/v1/me/debates${suffix}`, { auth: 'required', signal });
}
