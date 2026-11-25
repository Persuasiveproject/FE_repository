import { apiRequest } from './api-client.ts';
import { count, record } from './api-values.ts';

// API #45의 기존 응답만 사용합니다. 거래 내역 API를 호출하지 않습니다.
export async function getCoinBalance(): Promise<number> {
  const response = record(await apiRequest<unknown>('/v1/me/wallet', { auth: 'required' }));
  return count(record(response.data).coinBalance);
}
