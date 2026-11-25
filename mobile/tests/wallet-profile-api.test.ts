import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { clearBasicAuth } from '../src/services/basic-auth.ts';
import { createHttpGateway } from '../src/services/http-gateway.ts';

const savedFetch = globalThis.fetch;
const savedBase = process.env.EXPO_PUBLIC_API_BASE_URL;
afterEach(() => { clearBasicAuth(); globalThis.fetch = savedFetch; if (savedBase === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL; else process.env.EXPO_PUBLIC_API_BASE_URL = savedBase; });

const baseUser = { id: '42', status: 'ACTIVE', identityVerified: true, nickname: '판다', interests: [], credit: '30.000000', badges: [] };

async function signedIn(route: (url: string, init?: RequestInit) => Response | undefined) {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
  const gateway = createHttpGateway();
  const calls: { url: string; method: string; body: unknown }[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (url.endsWith('/v1/auth/kakao')) return Response.json({ data: { status: 'LOGGED_IN', accessToken: 'tok', expiresAt: '2026-12-25T00:00:00Z', user: baseUser } });
    return route(url, init) ?? Response.json({ error: { code: 'NOT_FOUND', message: 'x' } }, { status: 404 });
  };
  await gateway.signInKakao!('code', 'https://app.example/auth/kakao');
  return { gateway, calls };
}

test('코인 관리: 잔액과 거래 내역을 서버에서 읽고 종류를 한국어로 보여 준다', async () => {
  const { gateway } = await signedIn((url) => {
    if (url.endsWith('/v1/me/wallet')) return Response.json({ data: { coinBalance: 9 } });
    if (url.endsWith('/v1/me/coin-transactions')) return Response.json({ data: { transactions: [
      { id: '7', amount: -1, type: 'DEBATE_CREATE', balanceAfter: 9, refType: 'DEBATE', refId: '3', reversesTransactionId: null, createdAt: '2026-11-25T09:00:00Z' },
      { id: '6', amount: 10, type: 'SIGNUP_BONUS', balanceAfter: 10, refType: 'USER', refId: '42', reversesTransactionId: null, createdAt: '2026-11-25T08:00:00Z' },
    ] }, meta: { nextCursor: null } });
  });
  const wallet = await gateway.getWallet();
  assert.equal(wallet.balance, 9);
  assert.deepEqual(wallet.transactions.map((entry) => [entry.label, entry.amount]), [['토론 개설', -1], ['가입 축하 코인', 10]]);
});

test('프로필 수정: 닉네임이 바뀌면 PATCH /v1/me, 관심 주제는 PUT /v1/me/interests로 저장한다', async () => {
  let user = { ...baseUser };
  const { gateway, calls } = await signedIn((url, init) => {
    if (url.endsWith('/v1/categories')) return Response.json({ data: { categories: [{ id: '1', name: '사회', sortOrder: 0 }, { id: '2', name: '환경', sortOrder: 1 }] } });
    if (url.endsWith('/v1/me') && init?.method === 'PATCH') { user = { ...user, nickname: JSON.parse(String(init.body)).nickname }; return Response.json({ data: { nickname: user.nickname, updatedAt: '2026-11-25T09:00:00Z' } }); }
    if (url.endsWith('/v1/me/interests')) return Response.json({ data: { interests: [] } });
    if (url.endsWith('/v1/me')) return Response.json({ data: user });
  });
  const profile = await gateway.updateProfile({ nickname: ' 곰 ', interests: ['환경'] });
  assert.equal(profile.nickname, '곰');
  assert.deepEqual(calls.find((c) => c.method === 'PATCH')?.body, { nickname: '곰' });
  assert.deepEqual(calls.find((c) => c.url.endsWith('/v1/me/interests'))?.body, { categoryIds: ['2'] });

  calls.length = 0;
  await gateway.updateProfile({ nickname: '곰', interests: [] });
  assert.ok(!calls.some((c) => c.method === 'PATCH'), '닉네임이 그대로면 PATCH를 보내지 않는다');
});

test('프로필 수정: 서버가 영어로 거절하면 한국어 문구로 바꾸고, 금지어 문구는 그대로 둔다', async () => {
  let message = 'Use a nickname from 1 to 30 characters.';
  const { gateway } = await signedIn((url, init) => {
    if (url.endsWith('/v1/me') && init?.method === 'PATCH') return Response.json({ error: { code: 'NICKNAME_INVALID', message } }, { status: 400 });
  });
  await assert.rejects(gateway.updateProfile({ nickname: '곰돌', interests: [] }), { message: '사용할 수 없는 닉네임이에요.' });
  message = '금지 표현이 포함되어 있어요. 수정해주세요';
  await assert.rejects(gateway.updateProfile({ nickname: '곰돌', interests: [] }), { message });
});
