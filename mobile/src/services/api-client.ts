import type { ApiErrorBody } from '../types/api';
import { clearBasicAuth, getAuthRevision, getBasicSession, makeBasicHeader, type BasicCredentials } from './basic-auth.ts';

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
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  idempotencyKey?: string;
} & ({ auth: 'login'; credentials: BasicCredentials } | { auth: 'public' | 'optional' | 'required'; credentials?: never });

function isErrorBody(value: unknown): value is ApiErrorBody {
  if (!value || typeof value !== 'object' || !('error' in value)) return false;
  const error = value.error;
  return !!error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' &&
    'message' in error && typeof error.message === 'string';
}

export function apiOrigin(): string {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!base) throw new ApiError(0, 'API_NOT_CONFIGURED', 'API 서버 주소가 설정되지 않았습니다.');
  try {
    const url = new URL(base);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error();
    return url.origin;
  } catch { throw new ApiError(0, 'INVALID_API_URL', '서버 주소에는 origin만 입력해 주세요.'); }
}
// 시연용 Basic 인증이며 카카오/OAuth 로그인 구현과 구분합니다.
export async function apiRequest<T>(path: string, options: Options): Promise<T> {
  const snapshot = getAuthRevision();
  const session = getBasicSession();
  if (options.auth === 'required' && !session) throw new ApiError(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');
  const baseUrl = apiOrigin();
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://') || path.includes('\\') || path.includes('#')) {
    throw new ApiError(0, 'INVALID_API_URL', 'API 주소 설정을 확인해 주세요.');
  }
  if (session && options.auth !== 'public' && options.auth !== 'login' && session.origin !== baseUrl) throw new ApiError(0, 'AUTH_SERVER_CHANGED', '서버 주소가 변경되었습니다. 다시 로그인해 주세요.');
  const authorization = options.auth === 'login' ? makeBasicHeader(options.credentials) : options.auth === 'public' ? undefined : session?.authorization;
  if (options.auth === 'login' && (path !== '/v1/me' || (options.method ?? 'GET') !== 'GET')) throw new ApiError(0, 'INVALID_LOGIN_REQUEST', '로그인 요청 경로가 올바르지 않습니다.');
  if (authorization && !baseUrl.startsWith('https://')) throw new ApiError(0, 'HTTPS_REQUIRED', '시연 인증은 HTTPS 서버에서만 사용할 수 있습니다.');
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
      method: options.method ?? 'GET', signal: options.signal, credentials: 'omit', redirect: 'error',
      headers: { Accept: 'application/json', ...(authorization ? { Authorization: authorization } : {}),
        ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    if (options.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
    throw new ApiError(0, 'NETWORK_ERROR', '서버에 연결할 수 없습니다. 연결 상태를 확인해 주세요.');
  }
  if (options.auth !== 'public' && getAuthRevision() !== snapshot) throw new ApiError(0, 'SESSION_CHANGED', '로그인 계정이 바뀌었습니다. 화면을 다시 열어 주세요.');
  const text = await response.text();
  if (options.auth !== 'public' && getAuthRevision() !== snapshot) throw new ApiError(0, 'SESSION_CHANGED', '로그인 계정이 바뀌었습니다. 화면을 다시 열어 주세요.');
  if (response.status === 401 && options.auth !== 'public' && options.auth !== 'login') clearBasicAuth(snapshot);
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
