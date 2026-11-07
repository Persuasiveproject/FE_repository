import type { ApiErrorBody } from '../types/api';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  // 로그인 방식 미확정: 인증 API는 별도 인증 준비가 완료되기 전 네트워크로 보내지 않습니다.
  auth: 'public' | 'required';
};

function isErrorBody(value: unknown): value is ApiErrorBody {
  if (!value || typeof value !== 'object' || !('error' in value)) return false;
  const error = value.error;
  return !!error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' &&
    'message' in error && typeof error.message === 'string';
}

// 토큰·쿠키·CSRF 방식은 BE 로그인 계약 확정 후 추가합니다. Bearer라고 가정하지 않습니다.
export async function apiRequest<T>(path: string, options: Options): Promise<T> {
  if (options.auth === 'required') {
    throw new ApiError(0, 'AUTH_NOT_CONFIGURED', '로그인 연동을 먼저 설정해 주세요.');
  }
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!baseUrl) throw new ApiError(0, 'API_NOT_CONFIGURED', 'API 서버 주소가 설정되지 않았습니다.');
  if (!/^https?:\/\//i.test(baseUrl) || !path.startsWith('/') || path.startsWith('//') || path.includes('://')) {
    throw new ApiError(0, 'INVALID_API_URL', 'API 주소 설정을 확인해 주세요.');
  }
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
      method: options.method ?? 'GET', signal: options.signal, credentials: 'omit',
      headers: { Accept: 'application/json', ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    if (options.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
    throw new ApiError(0, 'NETWORK_ERROR', '서버에 연결할 수 없습니다. 연결 상태를 확인해 주세요.');
  }
  const text = await response.text();
  let payload: unknown;
  try { payload = text ? JSON.parse(text) : undefined; }
  catch {
    throw new ApiError(response.status, 'INVALID_RESPONSE', '서버 응답 형식이 올바르지 않습니다.');
  }
  if (!response.ok) {
    if (isErrorBody(payload)) throw new ApiError(response.status, payload.error.code, payload.error.message, payload.error.details);
    throw new ApiError(response.status, 'REQUEST_FAILED', '요청을 처리하지 못했습니다.');
  }
  return payload as T;
}
