import { ApiError } from './api-client.ts';

// TypeScript 타입만 믿지 않고 서버에서 받은 실제 값을 확인합니다.
export function invalidResponse(): never {
  throw new ApiError(200, 'INVALID_RESPONSE', '서버 응답 형식이 올바르지 않습니다.');
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalidResponse();
  return value as Record<string, unknown>;
}
export function string(value: unknown): string {
  if (typeof value !== 'string') invalidResponse();
  return value;
}
export function id(value: unknown): string {
  const text = string(value);
  if (!/^[1-9]\d{0,18}$/.test(text) || BigInt(text) > 9223372036854775807n) invalidResponse();
  return text;
}
export function routeId(value: unknown): string {
  try { return id(value); }
  catch { throw new ApiError(0, 'INVALID_ID', '올바른 토론 또는 의견 주소인지 확인해 주세요.'); }
}
export function count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) invalidResponse();
  return value;
}
export function timestamp(value: unknown): string {
  const text = string(value);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(text) || !Number.isFinite(Date.parse(text))) invalidResponse();
  return text;
}
export const nullableTime = (value: unknown) => value === null ? null : timestamp(value);
export function nextCursor(value: unknown): string | null {
  if (value === null) return null;
  const cursor = string(value);
  if (!cursor) invalidResponse();
  return cursor;
}
