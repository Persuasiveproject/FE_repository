import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { badgeProgress } from '../src/features/account/badge-progress.ts';
import { getCoinBalance } from '../src/services/wallet-api.ts';
import { clearBasicAuth, commitBasicAuth, getAuthRevision, makeBasicHeader } from '../src/services/basic-auth.ts';

const originalFetch = globalThis.fetch;
const originalBase = process.env.EXPO_PUBLIC_API_BASE_URL;
afterEach(() => {
  clearBasicAuth(); globalThis.fetch = originalFetch;
  if (originalBase === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
  else process.env.EXPO_PUBLIC_API_BASE_URL = originalBase;
});

test('배지 40·55점 경계와 소수 여섯 자리의 남은 점수를 정확히 계산한다', () => {
  for (const [credit, expected] of [
    ['0.000000', { nextBadge: '관점 탐험가', remaining: '40' }],
    ['30.125000', { nextBadge: '관점 탐험가', remaining: '9.875' }],
    ['39.999999', { nextBadge: '관점 탐험가', remaining: '0.000001' }],
    ['40.000000', { nextBadge: '생각 연결자', remaining: '15' }],
    ['54.999999', { nextBadge: '생각 연결자', remaining: '0.000001' }],
    ['55.000000', { nextBadge: null, remaining: '0' }],
    ['100.000000', { nextBadge: null, remaining: '0' }],
  ] as const) assert.deepEqual(badgeProgress(credit), expected);
  assert.deepEqual(badgeProgress(30), { nextBadge: '관점 탐험가', remaining: '10' });
});

test('잘못된 점수를 0점이나 가짜 배지 정보로 바꾸지 않는다', () => {
  for (const credit of [undefined, '', '-1.000000', '100.000001', '30.0000001', 'NaN', Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(badgeProgress(credit), null);
  }
});

function login() {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
  const credentials = { memberId: '201', password: 'fixture-only' };
  commitBasicAuth({ origin: 'https://api.example.test', memberId: '201', authorization: makeBasicHeader(credentials) }, getAuthRevision());
  return makeBasicHeader(credentials);
}

test('잔액 API #45를 본인 인증으로 매번 읽으며 0도 정상 잔액이다', async () => {
  const authorization = login(); let calls = 0;
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://api.example.test/v1/me/wallet');
    assert.equal(options?.method, 'GET');
    assert.equal(new Headers(options?.headers).get('Authorization'), authorization);
    return Response.json({ data: { coinBalance: calls++ === 0 ? 3 : 0 } });
  };
  assert.equal(await getCoinBalance(), 3);
  assert.equal(await getCoinBalance(), 0);
  assert.equal(calls, 2);
});

test('잔액이 없거나 잘못된 타입이면 가짜 잔액을 표시하지 않는다', async () => {
  login();
  for (const value of [undefined, null, '3', -1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    globalThis.fetch = async () => Response.json({ data: { coinBalance: value } });
    await assert.rejects(getCoinBalance(), { code: 'INVALID_RESPONSE' });
  }
});

test('미로그인과 실패한 잔액 조회는 성공값으로 처리하지 않는다', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ data: { coinBalance: 3 } }); };
  await assert.rejects(getCoinBalance(), { code: 'AUTH_REQUIRED' });
  assert.equal(calls, 0);
  login();
  globalThis.fetch = async () => Response.json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to continue.' } }, { status: 401 });
  await assert.rejects(getCoinBalance(), { code: 'AUTHENTICATION_REQUIRED' });
});
