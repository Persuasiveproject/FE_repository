import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { appendDebatePage, getPublicCategories, getPublicDebates, parseCategories, parsePublicDebates, toDiscussion } from '../src/services/public-api.ts';

const originalFetch = globalThis.fetch;
const originalBase = process.env.EXPO_PUBLIC_API_BASE_URL;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalBase === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
  else process.env.EXPO_PUBLIC_API_BASE_URL = originalBase;
});
const item = (changes: Record<string, unknown> = {}) => ({
  id: '9223372036854775807', kind: 'QUICK', title: 'AI 활용', status: 'OPEN',
  createdAt: '2026-11-09T01:00:00Z', categoryId: '9007199254740993', participantCount: 21,
  opinionCount: 4, viewCount: 99, startedAt: '2026-11-09T01:00:00Z', endsAt: null,
  closedAt: null, canceledAt: null, ...changes,
});
const envelope = (debates: unknown[] = [], nextCursor: string | null = null) => ({ data: { debates }, meta: { nextCursor } });

test('서버의 빈 목록·빈 카테고리를 데모 데이터로 채우지 않는다', () => {
  assert.deepEqual(parsePublicDebates(envelope()), envelope());
  assert.deepEqual(parseCategories({ data: { categories: [] } }), { data: { categories: [] } });
});
test('64비트 문자열 ID와 nullable 시각을 손실 없이 카드로 옮긴다', () => {
  const parsed = parsePublicDebates(envelope([item()]));
  const card = toDiscussion(parsed.data.debates[0], [{ id: '9007199254740993', name: '기술', sortOrder: 0 }]);
  assert.equal(card.id, '9223372036854775807');
  assert.equal(card.category, '기술');
  assert.equal(card.description, '');
  assert.equal(card.kind, '간단토론');
  assert.equal(card.participants, 21);
  assert.equal(parsed.data.debates[0].endsAt, null);
  assert.equal(toDiscussion(parsed.data.debates[0], []).category, '분류 미확인');
});
test('숫자·잘못된 범위의 ID, 알 수 없는 상태와 잘못된 집계를 거부한다', () => {
  for (const change of [
    { id: 9007199254740992 }, { id: '9223372036854775808' }, { id: '0' }, { categoryId: '1.2' },
    { status: 'DRAFT' }, { kind: 'OTHER' }, { participantCount: -1 }, { opinionCount: '4' }, { viewCount: 1.5 },
  ]) assert.throws(() => parsePublicDebates(envelope([item(change)])), { code: 'INVALID_RESPONSE' });
});
test('포장·필수 필드·UTC 시각·cursor 오류를 응답 오류로 처리한다', () => {
  for (const response of [
    {}, { data: { debates: [] } }, { data: { debates: null }, meta: { nextCursor: null } },
    envelope([item({ createdAt: null })]), envelope([item({ endsAt: undefined })]),
    envelope([item({ startedAt: '2026-11-09T10:00:00+09:00' })]),
    envelope([item({ createdAt: 'bad' })]), envelope([], ''),
  ]) assert.throws(() => parsePublicDebates(response), { code: 'INVALID_RESPONSE' });
});
test('카테고리 응답도 런타임에서 검사한다', () => {
  assert.equal(parseCategories({ data: { categories: [{ id: '2', name: '건강', sortOrder: 1 }] } }).data.categories[0].name, '건강');
  for (const category of [{ id: 2, name: '건강', sortOrder: 1 }, { id: '2', name: null, sortOrder: 1 }]) {
    assert.throws(() => parseCategories({ data: { categories: [category] } }), { code: 'INVALID_RESPONSE' });
  }
});
test('검색·서버 카테고리 ID·상태·불투명 cursor를 URL에 안전하게 전달한다', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://dev-api.example.test';
  const controller = new AbortController();
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(String(url));
    assert.equal(parsed.pathname, '/v1/debates');
    assert.equal(parsed.searchParams.get('query'), 'AI & 교육');
    assert.equal(parsed.searchParams.get('categoryId'), '9007199254740993');
    assert.equal(parsed.searchParams.get('status'), 'CLOSED');
    assert.equal(parsed.searchParams.get('sort'), 'latest');
    assert.equal(parsed.searchParams.get('cursor'), 'opaque+/= &');
    assert.equal(options?.credentials, 'omit');
    assert.equal(options?.signal, controller.signal);
    return Response.json(envelope());
  };
  await getPublicDebates({ query: ' AI & 교육 ', categoryId: '9007199254740993', status: 'CLOSED', cursor: 'opaque+/= &' }, controller.signal);
});
test('카테고리 함수는 공개 GET을 사용하며 API 오류를 그대로 유지한다', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://dev-api.example.test';
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://dev-api.example.test/v1/categories');
    assert.equal(options?.method, 'GET');
    return Response.json({ data: { categories: [] } });
  };
  assert.deepEqual(await getPublicCategories(), []);
  globalThis.fetch = async () => Response.json({ error: { code: 'FILTER_INVALID', message: '필터 오류' } }, { status: 400 });
  await assert.rejects(getPublicDebates({ status: 'OPEN' }), { status: 400, code: 'FILTER_INVALID' });
});
test('페이지를 합칠 때 중복 카드는 갱신하고 cursor 반복은 거부한다', () => {
  const first = parsePublicDebates(envelope([item()], 'cursor-a'));
  const second = parsePublicDebates(envelope([item({ participantCount: 22 }), item({ id: '2' })], 'cursor-b'));
  const merged = appendDebatePage(first.data.debates, second, ['cursor-a']);
  assert.deepEqual(merged.map((entry) => entry.id), ['9223372036854775807', '2']);
  assert.equal(merged[0].participantCount, 22);
  assert.throws(() => appendDebatePage(merged, first, ['cursor-a', 'cursor-b']), { code: 'INVALID_RESPONSE' });
});
