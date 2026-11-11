// 시연 전용. 인증정보를 디스크·환경변수·브라우저 저장소에 쓰지 않습니다.
export type BasicCredentials = { memberId: string; password: string };
type Session = { origin: string; memberId: string; authorization: string };
let session: Session | null = null;
let revision = 0;
const listeners = new Set<() => void>();
export const getAuthRevision = () => revision;
export const getBasicSession = () => session;
export function withAuthRevision<T>(expected: number, loader: () => Promise<T>): Promise<T> {
  if (expected !== revision) return Promise.reject(new Error('로그인 계정이 변경되었습니다. 화면을 다시 열어 주세요.'));
  return loader();
}
export function subscribeBasicAuth(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function notify() { revision++; for (const listener of listeners) listener(); }
export function clearBasicAuth(expectedRevision?: number) {
  if (expectedRevision !== undefined && expectedRevision !== revision) return;
  session = null; notify();
}
export function commitBasicAuth(value: Session, expectedRevision: number) {
  if (revision !== expectedRevision) throw new Error('로그인 상태가 변경되었습니다. 다시 로그인해 주세요.');
  session = value; notify();
}
export function makeBasicHeader({ memberId, password }: BasicCredentials): string {
  if (!/^[1-9]\d{0,18}$/.test(memberId) || BigInt(memberId) > 9223372036854775807n || !password || /[\r\n\u0000]/.test(password)) throw new Error('회원 ID와 비밀번호를 확인해 주세요.');
  const bytes: number[] = [];
  for (const part of encodeURIComponent(`${memberId}:${password}`).match(/%[0-9A-F]{2}|[^%]/g) ?? []) bytes.push(part.startsWith('%') ? parseInt(part.slice(1), 16) : part.charCodeAt(0));
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let encoded = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index]; const b = bytes[index + 1]; const c = bytes[index + 2];
    encoded += alphabet[a >> 2] + alphabet[((a & 3) << 4) | ((b ?? 0) >> 4)] + (b === undefined ? '=' : alphabet[((b & 15) << 2) | ((c ?? 0) >> 6)]) + (c === undefined ? '=' : alphabet[c & 63]);
  }
  return `Basic ${encoded}`;
}
let operation = 0;
export function newOperationKey(prefix: string) { return `${prefix}-${Date.now().toString(36)}-${++operation}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`; }
