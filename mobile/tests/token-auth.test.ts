import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { clearBasicAuth, getBasicSession, isTokenSession } from '../src/services/basic-auth.ts';
import { createHttpGateway } from '../src/services/http-gateway.ts';

const savedFetch = globalThis.fetch;
const savedBase = process.env.EXPO_PUBLIC_API_BASE_URL;
afterEach(() => { clearBasicAuth(); globalThis.fetch = savedFetch; if (savedBase === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL; else process.env.EXPO_PUBLIC_API_BASE_URL = savedBase; });

const user = { id: '42', status: 'ACTIVE', identityVerified: true, nickname: '판다', interests: [], credit: '30.000000', badges: [] };

test('휴대폰 인증: 처음이면 가입표, 가입하면 Bearer 토큰으로 이후 요청을 보내고 로그아웃하면 지운다', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
  const gateway = createHttpGateway();
  const calls: { url: string; auth: string | null; body: unknown }[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    calls.push({ url, auth: headers.get('Authorization'), body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (url.endsWith('/v1/auth/phone/code')) return Response.json({ data: { expiresInSeconds: 180, resendAfterSeconds: 30, devCode: '123456' } });
    if (url.endsWith('/v1/auth/phone/verify')) return Response.json({ data: { status: 'SIGNUP_REQUIRED', signupToken: 'ticket', method: 'PHONE' } });
    if (url.endsWith('/v1/auth/signup')) return Response.json({ data: { status: 'LOGGED_IN', accessToken: 'tok-1', expiresAt: '2026-12-25T00:00:00Z', user } }, { status: 201 });
    if (url.endsWith('/v1/me')) return Response.json({ data: user });
    if (url.endsWith('/v1/auth/logout')) return new Response(null, { status: 204 });
    return Response.json({ error: { code: 'NOT_FOUND', message: 'x' } }, { status: 404 });
  };
  assert.equal((await gateway.requestPhoneCode!('01012345678')).devCode, '123456');
  const result = await gateway.verifyPhoneCode!('01012345678', '123456');
  assert.deepEqual(result, { status: 'SIGNUP_REQUIRED', signupToken: 'ticket', method: 'PHONE' });
  assert.equal(getBasicSession(), null);

  const profile = await gateway.completeSignup!({ signupToken: 'ticket', nickname: ' 판다 ', agreedTermIds: ['1', '2'], interests: [] });
  assert.equal(profile.nickname, '판다');
  assert.deepEqual(calls.find((c) => c.url.endsWith('/v1/auth/signup'))?.body, { signupToken: 'ticket', nickname: '판다', agreedTermIds: ['1', '2'] });
  assert.ok(isTokenSession());
  await gateway.getSession();
  assert.equal(calls.at(-1)?.auth, 'Bearer tok-1');
  // 가입·로그인 요청 자체에는 인증 헤더를 보내지 않는다
  assert.ok(calls.filter((c) => c.url.includes('/v1/auth/') && !c.url.endsWith('/logout')).every((c) => c.auth === null));

  await gateway.signOut();
  assert.equal(calls.at(-1)?.url, 'https://api.example.test/v1/auth/logout');
  assert.equal(calls.at(-1)?.auth, 'Bearer tok-1');
  assert.equal(getBasicSession(), null);
});

test('이미 가입한 카카오 계정은 바로 로그인되고, 서버 오류 문구를 그대로 보여 준다', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
  const gateway = createHttpGateway();
  globalThis.fetch = async (input) => String(input).endsWith('/v1/auth/kakao')
    ? Response.json({ data: { status: 'LOGGED_IN', accessToken: 'tok-k', expiresAt: '2026-12-25T00:00:00Z', user } })
    : Response.json({ error: { code: 'X', message: 'x' } }, { status: 500 });
  const result = await gateway.signInKakao!('code', 'https://app.example/auth/kakao');
  assert.equal(result.status, 'LOGGED_IN');
  assert.equal(getBasicSession()?.authorization, 'Bearer tok-k');

  clearBasicAuth();
  globalThis.fetch = async () => Response.json({ error: { code: 'CODE_MISMATCH', message: '인증번호가 맞지 않아요. 4번 더 시도할 수 있어요.' } }, { status: 400 });
  await assert.rejects(gateway.verifyPhoneCode!('01012345678', '000000'), { message: '인증번호가 맞지 않아요. 4번 더 시도할 수 있어요.' });
});
