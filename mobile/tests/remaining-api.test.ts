import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { clearBasicAuth, makeBasicHeader } from '../src/services/basic-auth.ts';
import { createHttpGateway } from '../src/services/http-gateway.ts';
import { appendNotifications, getNotifications, getServerSummary, getServerTiming, getStanceEvents, parseDraft, parseEvents, parseNotifications, parseSummary, parseTiming, patchDraft, serverClockState } from '../src/services/remaining-api.ts';

const originalFetch = globalThis.fetch;
const originalBase = process.env.EXPO_PUBLIC_API_BASE_URL;
afterEach(() => { clearBasicAuth(); globalThis.fetch = originalFetch; if (originalBase === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL; else process.env.EXPO_PUBLIC_API_BASE_URL = originalBase; });
const time = '2026-11-11T01:00:00Z';
const credentials = { memberId: '201', password: 'fixture-only' };
const category = { id: '1', name: '주제', sortOrder: 0 };
const categories = { data: { categories: [category] } };
const input = { category: '주제', kind: 'QUICK' as const, durationMinutes: 5, title: '초안 제목', content: '초안 내용' };
const dto = { debateId: '701', categoryId: '1', kind: 'QUICK', title: input.title, content: input.content, durationMinutes: 5, createdAt: time, status: 'DRAFT' };
const draftDetail = (value = dto) => ({ data: { debate: { ...value, id: value.debateId, category }, images: [], myParticipation: null } });
const openDetail = { data: { debate: { id: '701', category, kind: 'QUICK', title: input.title, content: input.content, status: 'OPEN', durationMinutes: 5, createdAt: time, startedAt: time, endsAt: '2026-11-11T01:05:00Z', closedAt: null, canceledAt: null, participantCount: 0 }, participantCount: 0, myParticipation: null, images: [] } };
const timing = { debateId: 701, status: 'OPEN', serverTime: '2026-11-11T10:00:00+09:00', endsAt: '2026-11-11T10:05:00+09:00', remainingSeconds: 300, isReadOnly: false };
const notification = { notificationId: '9223372036854775807', type: 'REPLY', title: '새 답글', body: null, targetType: 'DEBATE', targetId: '701', isRead: false, createdAt: time };
const notificationPage = (rows = [notification], cursor: string | null = null) => ({ data: { notifications: rows, unreadCount: rows.length }, meta: { nextCursor: cursor } });
async function login() {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
  const gateway = createHttpGateway();
  globalThis.fetch = async () => Response.json({ data: { id: credentials.memberId, status: 'ACTIVE', nickname: '검증', interests: [], credit: '0.000000', badges: [] } });
  await gateway.signInBasic!(credentials); return gateway;
}

test('요약은 실제 찬반/원문 ID/생성 시각을 보존하며 비어 있을 때 가짜 요약을 만들지 않는다', () => {
  assert.deepEqual(parseSummary({ data: { summaries: [] } }), { generatedAt: null, sections: [] });
  const summary = parseSummary({ data: { summaries: [{ stance: 'PRO', summaryText: '찬성 근거', sourcePostIds: ['9223372036854775807', '9223372036854775807'], createdAt: time }, { stance: 'CON', summaryText: '반대 근거', sourcePostIds: [], createdAt: '2026-11-11T02:00:00Z' }] } });
  assert.equal(summary.generatedAt, '2026-11-11T02:00:00Z'); assert.equal(summary.sections.length, 2);
  assert.deepEqual(summary.sections[0].opinionIds, ['9223372036854775807']);
  for (const stance of ['NEUTRAL', 'UNKNOWN']) assert.throws(() => parseSummary({ data: { summaries: [{ stance, summaryText: '근거', sourcePostIds: [], createdAt: time }] } }), { code: 'INVALID_RESPONSE' });
});
test('입장 이력은 영업 기록 ID를 글 ID로 바꾸지 않고 없거나 잘못된 값은 구분한다', () => {
  const event = { id: '1', fromStance: 'CON', toStance: 'PRO', persuasionId: null, changedAt: time };
  assert.deepEqual(parseEvents({ data: { events: [event] } }), [event]);
  assert.deepEqual(parseEvents({ data: { events: [] } }), []);
  assert.throws(() => parseEvents({ data: { events: [{ ...event, toStance: 'OTHER' }] } }), { code: 'INVALID_RESPONSE' });
});
test('알림은 읽음 상태·nullable 대상·64비트 ID·서버 미읽음 수를 보존한다', () => {
  const parsed = parseNotifications(notificationPage());
  assert.equal(parsed.items[0].id, notification.notificationId); assert.equal(parsed.items[0].isRead, false); assert.equal(parsed.items[0].body, null); assert.equal(parsed.unreadCount, 1);
  assert.deepEqual(parseNotifications(notificationPage([])).items, []);
  assert.throws(() => parseNotifications(notificationPage([{ ...notification, isRead: 'false' as never }])), { code: 'INVALID_RESPONSE' });
  assert.throws(() => parseNotifications({ data: { notifications: [], unreadCount: -1 }, meta: { nextCursor: null } }), { code: 'INVALID_RESPONSE' });
});
test('알림 페이지는 중복을 합치고 반복 cursor로 무한 조회하지 않는다', () => {
  const first = parseNotifications(notificationPage());
  assert.equal(appendNotifications(first.items, first, []).length, 1);
  assert.throws(() => appendNotifications(first.items, { ...first, nextCursor: 'loop' }, ['loop']), { code: 'INVALID_RESPONSE' });
});
test('서버 타이밍은 +09:00·숫자 ID를 처리하고 손실된 큰 숫자 ID/다른 토론/상태 충돌은 거부한다', () => {
  const parsed = parseTiming(timing, '701'); assert.equal(Date.parse(parsed.serverTime), Date.parse(time)); assert.equal(parsed.endsAt, '2026-11-11T01:05:00.000Z');
  for (const data of [{ ...timing, debateId: 9007199254740992 }, { ...timing, debateId: 702 }, { ...timing, status: 'CLOSED' }, { ...timing, serverTime: '2026-11-11T10:00:00' }]) assert.throws(() => parseTiming(data, '701'), { code: 'INVALID_RESPONSE' });
  assert.equal(parseTiming({ ...timing, debateId: '9223372036854775807' }, '9223372036854775807').debateId, '9223372036854775807');
});
test('남은 시간은 장치 벽시계와 무관하게 서버 시각·통신 지연·경과 시간으로 마감된다', () => {
  const sample = { ...parseTiming(timing, '701'), monotonicAt: 1000, halfRoundTripMs: 500 };
  assert.equal(serverClockState(sample, 2000).remainingSeconds, 299);
  assert.equal(serverClockState(sample, 301000).remainingSeconds, 0); assert.equal(serverClockState(sample, 301000).isReadOnly, true);
  const endless = { ...sample, endsAt: null, remainingSeconds: null }; assert.equal(serverClockState(endless, 999999).remainingSeconds, null);
  assert.equal(serverClockState({ ...endless, status: 'CLOSED', isReadOnly: true }).isReadOnly, true);
});
test('개인 알림/이력은 로그인 전 요청을 막고 요약/타이밍은 공개 조회할 수 있다', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test'; let calls = 0;
  globalThis.fetch = async (url, options) => { calls++; assert.equal(new Headers(options?.headers).get('authorization'), null); return Response.json(String(url).endsWith('/timing') ? timing : { data: { summaries: [] } }); };
  await assert.rejects(getNotifications(), { code: 'AUTH_REQUIRED' }); await assert.rejects(getStanceEvents('701'), { code: 'AUTH_REQUIRED' }); assert.equal(calls, 0);
  await getServerSummary('701'); await getServerTiming('701'); assert.equal(calls, 2);
});
test('알림 필터와 불투명 cursor는 인코딩하고 개인 요청에 Basic을 전달한다', async () => {
  await login();
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(String(url)); assert.equal(parsed.pathname, '/v1/me/notifications'); assert.equal(parsed.searchParams.get('unreadOnly'), 'true'); assert.equal(parsed.searchParams.get('cursor'), 'opaque+/=');
    assert.equal(new Headers(options?.headers).get('authorization'), makeBasicHeader(credentials)); return Response.json(notificationPage());
  };
  await getNotifications({ unreadOnly: true, cursor: 'opaque+/=' });
});
test('게시 전 초안은 GET/PATCH로만 편집하며 QUICK/ENDLESS 시간과 게시 후 편집 금지를 검증한다', () => {
  assert.equal(parseDraft(dto).id, '701'); assert.equal(parseDraft({ ...dto, kind: 'ENDLESS', durationMinutes: null }).durationMinutes, null);
  assert.throws(() => parseDraft({ ...dto, status: 'OPEN' }), { code: 'NOT_DRAFT' });
  assert.throws(() => parseDraft({ ...dto, kind: 'ENDLESS' }), { code: 'INVALID_RESPONSE' });
  assert.throws(() => parseDraft({ ...dto, durationMinutes: 4 }), { code: 'INVALID_RESPONSE' });
});
test('초안 저장→같은 ID PATCH→불러오기→게시에서 내용을 보존하고 게시 목록에서 제외한다', async () => {
  const gateway = await login(); let stored = { ...dto }; const writes: string[] = [];
  globalThis.fetch = async (url, options) => {
    const path = new URL(String(url)).pathname;
    if (path === '/v1/categories') return Response.json(categories);
    if (path === '/v1/debates') { writes.push('POST'); return Response.json({ data: { debateId: '701', status: 'DRAFT', createdAt: time } }); }
    if (options?.method === 'PATCH') { writes.push('PATCH'); stored = { ...stored, ...JSON.parse(String(options.body)) }; return Response.json({ data: { draft: stored } }); }
    if (path.endsWith('/publish')) { writes.push('publish'); return Response.json({ data: { debateId: '701', status: 'OPEN', coinBalance: 5 } }); }
    return Response.json(writes.includes('publish') ? openDetail : draftDetail(stored));
  };
  const first = await gateway.saveDraft!(input, 'edit-intent'); const edited = { ...input, title: '수정한 제목' };
  await gateway.saveDraft!(edited, 'edit-intent', first.id); assert.equal((await gateway.getDraft!(first.id)).input.title, edited.title);
  const snapshots = gateway.getSavedDrafts!(); assert.equal(snapshots.length, 1); snapshots[0].input.title = '외부 변경'; assert.equal(gateway.getSavedDrafts!()[0].input.title, edited.title);
  await gateway.publishDraft!(first.id, edited); assert.deepEqual(writes, ['POST', 'PATCH', 'publish']); assert.equal(gateway.getSavedDrafts!().length, 0);
});
test('저장 후 수정한 내용은 게시 전에 PATCH하고 응답 유실 재시도는 PATCH/생성을 반복하지 않는다', async () => {
  const gateway = await login(); let patches = 0; let posts = 0; const publishKeys: string[] = [];
  globalThis.fetch = async (url, options) => {
    const path = new URL(String(url)).pathname;
    if (path === '/v1/categories') return Response.json(categories);
    if (path === '/v1/debates') { posts++; return Response.json({ data: { debateId: '701', status: 'DRAFT', createdAt: time } }); }
    if (options?.method === 'PATCH') { patches++; return Response.json({ data: { draft: { ...dto, ...JSON.parse(String(options.body)) } } }); }
    if (path.endsWith('/publish')) { publishKeys.push(new Headers(options?.headers).get('idempotency-key')!); if (publishKeys.length === 1) throw new TypeError('응답 유실'); return Response.json({ data: { debateId: '701', status: 'OPEN', coinBalance: 5 } }); }
    return Response.json(openDetail);
  };
  const draft = await gateway.saveDraft!(input, 'save'); const edit = { ...input, content: '바뀐 본문' };
  await assert.rejects(gateway.publishDraft!(draft.id, edit), { code: 'NETWORK_ERROR' });
  await assert.rejects(gateway.saveDraft!(input, 'save', draft.id), { code: 'PUBLISH_IN_PROGRESS' });
  await gateway.publishDraft!(draft.id, edit);
  assert.equal(patches, 1); assert.equal(posts, 1); assert.equal(publishKeys.length, 2); assert.ok(publishKeys[0]); assert.equal(publishKeys[0], publishKeys[1]);
});
test('다른 작성자의 초안 수정/게시된 글 수정은 서버 오류를 유지하고 다른 계정에 초안을 남기지 않는다', async () => {
  const gateway = await login();
  globalThis.fetch = async (url) => String(url).endsWith('/categories') ? Response.json(categories) : Response.json({ data: { debateId: '701', status: 'DRAFT', createdAt: time } });
  await gateway.saveDraft!(input, 'save'); assert.equal(gateway.getSavedDrafts!().length, 1);
  for (const [status, code] of [[403, 'NOT_DEBATE_CREATOR'], [409, 'NOT_DRAFT']] as const) {
    globalThis.fetch = async () => Response.json({ error: { code, message: '편집 불가' } }, { status });
    await assert.rejects(patchDraft('701', { categoryId: '1', kind: 'QUICK', title: '제목', content: '본문', durationMinutes: 5 }), { status, code });
  }
  await gateway.signOut(); await assert.rejects(gateway.getDraft!('701'), { code: 'AUTH_REQUIRED' }); assert.throws(() => gateway.getSavedDrafts!(), { code: 'AUTH_REQUIRED' });
});
test('초안 편집의 카테고리 조회 중 로그아웃하면 후속 PATCH를 보내지 않는다', async () => {
  const gateway = await login();
  globalThis.fetch = async (url) => String(url).endsWith('/categories') ? Response.json(categories) : Response.json({ data: { debateId: '701', status: 'DRAFT', createdAt: time } });
  await gateway.saveDraft!(input, 'save'); let release!: (value: Response) => void; let writes = 0;
  globalThis.fetch = async (url, options) => { if (String(url).endsWith('/categories')) return new Promise<Response>((resolve) => { release = resolve; }); if (options?.method === 'PATCH') writes++; return Response.json({}); };
  const update = gateway.saveDraft!({ ...input, title: '새 제목' }, 'save', '701'); await gateway.signOut(); release(Response.json(categories));
  await assert.rejects(update, { code: 'SESSION_CHANGED' }); assert.equal(writes, 0);
});
test('초안 PATCH 응답 유실 뒤 원래 내용으로 되돌려 게시해도 서버 내용을 다시 확정한다', async () => {
  const gateway = await login(); let patches = 0; let stored = { ...dto };
  globalThis.fetch = async (url, options) => {
    const path = new URL(String(url)).pathname;
    if (path === '/v1/categories') return Response.json(categories);
    if (path === '/v1/debates') return Response.json({ data: { debateId: '701', status: 'DRAFT', createdAt: time } });
    if (options?.method === 'PATCH') {
      patches++; stored = { ...stored, ...JSON.parse(String(options.body)) };
      if (patches === 1) throw new TypeError('서버에는 적용됐지만 응답은 유실');
      return Response.json({ data: { draft: stored } });
    }
    if (path.endsWith('/publish')) { assert.equal(stored.content, input.content); return Response.json({ data: { debateId: '701', status: 'OPEN', coinBalance: 5 } }); }
    return Response.json(openDetail);
  };
  const draft = await gateway.saveDraft!(input, 'save');
  await assert.rejects(gateway.saveDraft!({ ...input, content: '임시 수정' }, 'save', draft.id), { code: 'NETWORK_ERROR' });
  await gateway.publishDraft!(draft.id, input); assert.equal(patches, 2);
});
