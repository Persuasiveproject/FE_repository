import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { apiRequest } from '../src/services/api-client.ts';
import { clearBasicAuth, getBasicSession, makeBasicHeader } from '../src/services/basic-auth.ts';
import { createHttpGateway } from '../src/services/http-gateway.ts';
import { parseResults } from '../src/services/http-models.ts';

const savedFetch = globalThis.fetch;
const savedBase = process.env.EXPO_PUBLIC_API_BASE_URL;
afterEach(() => { clearBasicAuth(); globalThis.fetch = savedFetch; if (savedBase === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL; else process.env.EXPO_PUBLIC_API_BASE_URL = savedBase; });
const credentials = { memberId: '101', password: 'unit-test-only-비밀' };
const now = '2026-11-11T01:00:00Z';
const me = (memberId = '101') => ({ data: { id: memberId, status: 'ACTIVE', nickname: '테스트', interests: [{ id: '1', name: '시연 주제', sortOrder: 0 }], credit: '30.123456', badges: [] } });
const detail = (version = 0) => ({ data: { participantCount: 1, images: [], myParticipation: { participantId: '601', anonymousNo: 1, initialStance: 'CON', currentStance: version ? 'PRO' : 'CON', version }, debate: {
  id: '501', kind: 'QUICK', title: '테스트 토론', content: '본문', category: { id: '1', name: '시연 주제', sortOrder: 0 }, status: 'OPEN', createdAt: now, startedAt: now, endsAt: '2026-11-11T01:05:00Z', closedAt: null, canceledAt: null, participantCount: 1, durationMinutes: 5,
} } });
async function login() {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
  const gateway = createHttpGateway();
  globalThis.fetch = async () => Response.json(me());
  await gateway.signInBasic!(credentials);
  return gateway;
}

test('UTF-8 Basic 인코딩과 회원 ID 검증', () => {
  assert.equal(makeBasicHeader(credentials), `Basic ${Buffer.from(`${credentials.memberId}:${credentials.password}`, 'utf8').toString('base64')}`);
  assert.throws(() => makeBasicHeader({ memberId: 'id:name', password: 'unit' }));
  assert.throws(() => makeBasicHeader({ memberId: '1', password: '' }));
});
test('로그인은 /me 검증 후에만 메모리에 반영하고 Decimal 문자열과 미확인 잔액을 보존한다', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
  globalThis.fetch = async (url, options) => {
    assert.equal(getBasicSession(), null);
    assert.equal(new URL(String(url)).pathname, '/v1/me');
    assert.equal(new Headers(options?.headers).get('authorization'), makeBasicHeader(credentials));
    assert.equal(options?.redirect, 'error'); assert.equal(options?.credentials, 'omit');
    return Response.json(me());
  };
  const gateway = createHttpGateway(); const profile = await gateway.signInBasic!(credentials);
  assert.equal(profile.credit, '30.123456'); assert.equal(profile.coins, null); assert.equal(getBasicSession()?.memberId, '101');
  assert.ok(!('password' in getBasicSession()!));
});
test('로그인 실패와 비활성 회원은 인증정보를 보관하지 않는다', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
  const gateway = createHttpGateway();
  globalThis.fetch = async () => Response.json({ error: { code: 'AUTH_REQUIRED', message: '인증 실패' } }, { status: 401 });
  await assert.rejects(gateway.signInBasic!(credentials), { status: 401 }); assert.equal(getBasicSession(), null);
  globalThis.fetch = async () => Response.json({ data: { ...me().data, status: 'SUSPENDED' } });
  await assert.rejects(gateway.signInBasic!(credentials)); assert.equal(getBasicSession(), null);
});
test('인증/개인화 요청에만 헤더를 전달하고 로그아웃 후에는 요청 전에 차단한다', async () => {
  const gateway = await login();
  globalThis.fetch = async (_url, options) => {
    assert.equal(new Headers(options?.headers).get('authorization'), makeBasicHeader(credentials));
    assert.equal(new Headers(options?.headers).get('idempotency-key'), 'test-operation');
    return Response.json({ data: {} });
  };
  await apiRequest('/v1/example', { auth: 'required', method: 'PUT', idempotencyKey: 'test-operation', body: {} });
  await apiRequest('/v1/home', { auth: 'optional', idempotencyKey: 'test-operation' });
  globalThis.fetch = async (_url, options) => { assert.equal(new Headers(options?.headers).get('authorization'), null); return Response.json({}); };
  await apiRequest('/v1/categories', { auth: 'public' });
  await gateway.signOut(); assert.equal(await gateway.getSession(), null);
  globalThis.fetch = async () => { throw new Error('네트워크 금지'); };
  await assert.rejects(apiRequest('/v1/me', { auth: 'required' }), { code: 'AUTH_REQUIRED' });
});
test('HTTP와 다른 origin으로 인증정보가 전송되지 않는다', async () => {
  await login();
  globalThis.fetch = async () => { throw new Error('네트워크 금지'); };
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://another.example.test';
  await assert.rejects(apiRequest('/v1/home', { auth: 'optional' }), { code: 'AUTH_SERVER_CHANGED' });
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://api.example.test';
  await assert.rejects(apiRequest('/v1/me', { auth: 'login', credentials }), { code: 'HTTPS_REQUIRED' });
});
test('401은 현재 인증을 비우지만 이전 계정의 늦은 응답은 새 로그인을 지우지 않는다', async () => {
  const gateway = await login();
  let resolveOld!: (value: Response) => void;
  globalThis.fetch = async (url, options) => {
    const authorization = new Headers(options?.headers).get('authorization');
    if (String(url).endsWith('/v1/old')) return new Promise<Response>((resolve) => { resolveOld = resolve; });
    return Response.json(me(authorization === makeBasicHeader(credentials) ? '101' : '102'));
  };
  const old = apiRequest('/v1/old', { auth: 'required' });
  await gateway.signInBasic!({ memberId: '102', password: 'unit-next-account' });
  resolveOld(Response.json({ error: { code: 'AUTH_REQUIRED', message: 'old response' } }, { status: 401 }));
  await assert.rejects(old, { code: 'SESSION_CHANGED' }); assert.equal(getBasicSession()?.memberId, '102');
  globalThis.fetch = async () => Response.json({ error: { code: 'AUTH_REQUIRED', message: 'expired' } }, { status: 401 });
  await assert.rejects(apiRequest('/v1/me', { auth: 'required' }), { status: 401 }); assert.equal(getBasicSession(), null);
});
test('게시 응답 유실 후 재시도는 같은 초안과 멱등성 키를 사용한다', async () => {
  const gateway = await login(); let drafts = 0; let publishes = 0; const keys: string[] = [];
  globalThis.fetch = async (url, options) => {
    const path = new URL(String(url)).pathname;
    if (path === '/v1/categories') return Response.json({ data: { categories: [{ id: '1', name: '시연 주제', sortOrder: 0 }] } });
    if (path === '/v1/debates') { drafts++; const body = JSON.parse(String(options?.body)); assert.equal(body.categoryId, '1'); assert.equal(body.durationMinutes, 5); return Response.json({ data: { debateId: '501', status: 'DRAFT', createdAt: now } }, { status: 201 }); }
    if (path.endsWith('/publish')) { publishes++; keys.push(new Headers(options?.headers).get('idempotency-key')!); if (publishes === 1) throw new TypeError('응답 유실'); return Response.json({ data: { debateId: '501', status: 'OPEN', coinBalance: 4 } }); }
    return Response.json(detail());
  };
  const input = { category: '시연 주제', kind: 'QUICK' as const, durationMinutes: 5, title: '제목', content: '본문' };
  await assert.rejects(gateway.createDebate(input, 'same-intent'), { code: 'NETWORK_ERROR' });
  await assert.rejects(gateway.createDebate({ ...input, title: '다른 제목' }, 'same-intent'), { code: 'REQUEST_PAYLOAD_CHANGED' });
  assert.equal((await gateway.createDebate(input, 'same-intent')).id, '501');
  assert.equal(drafts, 1); assert.equal(publishes, 2); assert.ok(keys[0]); assert.equal(keys[0], keys[1]);
});
test('초안 POST 결과가 불명확하면 초안을 자동 중복 생성하지 않는다', async () => {
  const gateway = await login(); let drafts = 0;
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/v1/categories')) return Response.json({ data: { categories: [{ id: '1', name: '시연 주제', sortOrder: 0 }] } });
    drafts++; throw new TypeError('응답 유실');
  };
  const input = { category: '시연 주제', kind: 'ENDLESS' as const, durationMinutes: 15, title: '제목', content: '본문' };
  await assert.rejects(gateway.createDebate(input, 'intent'), { code: 'NETWORK_ERROR' });
  await assert.rejects(gateway.createDebate(input, 'intent'), { code: 'DRAFT_CREATE_UNCERTAIN' }); assert.equal(drafts, 1);
});
test('입장 PATCH 후에는 내 입장 GET 대신 상세의 새 version을 읽는다', async () => {
  const gateway = await login(); const paths: string[] = [];
  globalThis.fetch = async (url, options) => {
    const path = new URL(String(url)).pathname; paths.push(path);
    if (options?.method === 'PATCH') { assert.equal(JSON.parse(String(options.body)).version, 0); assert.ok(new Headers(options.headers).get('idempotency-key')); return Response.json({ data: { currentStance: 'PRO', eventId: '1', persuasionId: null, reward: null } }); }
    return Response.json(detail(1));
  };
  const membership = await gateway.changeStance({ debateId: '501', stance: 'PRO', version: 0 });
  assert.equal(membership.version, 1); assert.equal(membership.initialStance, 'CON'); assert.equal(membership.currentStance, 'PRO');
  assert.deepEqual(paths, ['/v1/debates/501/me/stance', '/v1/debates/501']);
});
test('결과의 숨김 null을 보존하고 PENDING/FAILED 오류를 구분한다', async () => {
  const gateway = await login();
  const parsed = parseResults({ data: { counts: { totalParticipants: 2, finalPro: 2, finalCon: 0, finalNeutral: 0, opinionCount: 2, rebuttalCount: 1, stanceChangedCount: null, stanceKeptCount: null }, sankeyData: [], computedAt: now } }, '501');
  assert.equal(parsed.changed, null); assert.deepEqual(parsed.transitions, []);
  for (const status of ['PENDING', 'FAILED']) {
    globalThis.fetch = async () => Response.json({ error: { code: 'RESULT_NOT_READY', message: 'wait', details: { status } } }, { status: 409 });
    await assert.rejects(gateway.getResults('501'), (error: unknown) => { const value = error as {details: {status: string}; message: string}; assert.equal(value.details.status, status); assert.ok(value.message.includes(status === 'FAILED' ? '실패' : '기다리고')); return true; });
  }
});

test('카테고리를 기다리는 동안 계정을 바꾸면 이전 생성 의도를 새 계정으로 전송하지 않는다', async () => {
  const gateway = await login(); let release!: (value: Response) => void; let writes = 0;
  globalThis.fetch = async (url, options) => {
    if (String(url).endsWith('/v1/categories')) return new Promise<Response>((resolve) => { release = resolve; });
    if (options?.method === 'POST') { writes++; throw new Error('쓰기 금지'); }
    return Response.json(me('102'));
  };
  const operation = gateway.createDebate({ category: '시연 주제', kind: 'QUICK', durationMinutes: 5, title: '제목', content: '본문' }, 'switch-test');
  await gateway.signInBasic!({ memberId: '102', password: 'unit-next-account' });
  release(Response.json({ data: { categories: [{ id: '1', name: '시연 주제', sortOrder: 0 }] } }));
  await assert.rejects(operation, { code: 'SESSION_CHANGED' }); assert.equal(writes, 0);
});
test('응답 본문을 읽는 도중 계정을 바꿔도 이전 계정의 데이터는 반환하지 않는다', async () => {
  const gateway = await login(); let release!: (value: string) => void; let reading!: () => void;
  const started = new Promise<void>((resolve) => { reading = resolve; });
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/v1/slow-body')) {
      const response = new Response();
      response.text = () => { reading(); return new Promise<string>((resolve) => { release = resolve; }); };
      return response;
    }
    return Response.json(me('102'));
  };
  const old = apiRequest('/v1/slow-body', { auth: 'required' }); await started;
  await gateway.signInBasic!({ memberId: '102', password: 'unit-next-account' });
  release(JSON.stringify(me())); await assert.rejects(old, { code: 'SESSION_CHANGED' });
  assert.equal(getBasicSession()?.memberId, '102');
});
