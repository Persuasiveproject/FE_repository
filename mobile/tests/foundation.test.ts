import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { apiRequest, ApiError } from '../src/services/api-client.ts';
import { filterDiscussions } from '../src/features/discussions/filter-discussions.ts';
import { createMockHomeFeed, mockDiscussions } from '../src/features/discussions/mock-discussions.ts';

const originalFetch = globalThis.fetch;
const originalBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalBaseUrl === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
  else process.env.EXPO_PUBLIC_API_BASE_URL = originalBaseUrl;
});

test('기존 예시 ID 1~3과 카테고리/검색/빈 상태를 유지한다', () => {
  for (const id of [1, 2, 3]) assert.ok(mockDiscussions.some((item) => item.id === id));
  assert.equal(filterDiscussions(mockDiscussions, '  주 4일  ', '사회', 'OPEN')[0]?.id, 2);
  assert.equal(filterDiscussions(mockDiscussions, '', '경제', 'OPEN').length, 0);
  assert.equal(filterDiscussions(mockDiscussions, 'AI', '문화', 'OPEN').length, 0);
  assert.equal(filterDiscussions(mockDiscussions, '', '전체', 'CLOSED').length, 0);
});

test('홈 인기/추천은 같은 토론 ID로 이동하며 원본 Mock을 변경하지 않는다', () => {
  const feed = createMockHomeFeed();
  assert.equal(feed.popular[0].id, feed.recommended[0].id);
  feed.popular[0].title = '수정';
  assert.notEqual(createMockHomeFeed().popular[0].title, '수정');
});

test('서버 주소 누락과 미설정 인증은 네트워크 요청 전에 차단한다', async () => {
  delete process.env.EXPO_PUBLIC_API_BASE_URL;
  globalThis.fetch = async () => { throw new Error('네트워크에 도달하면 안 됨'); };
  await assert.rejects(apiRequest('/v1/test', { auth: 'public' }), { code: 'API_NOT_CONFIGURED' });
  await assert.rejects(apiRequest('/v1/me/debates', { auth: 'required' }), { code: 'AUTH_NOT_CONFIGURED' });
});

test('공개 요청에는 쿠키를 보내지 않고 Base URL과 JSON을 처리한다', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test/';
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.example.test/v1/test');
    assert.equal(options?.credentials, 'omit');
    assert.equal(options?.body, JSON.stringify({ title: '토론' }));
    return new Response(JSON.stringify({ data: { id: '1' } }), { status: 200 });
  };
  assert.deepEqual(await apiRequest('/v1/test', { auth: 'public', method: 'POST', body: { title: '토론' } }), { data: { id: '1' } });
});

test('BE 오류의 HTTP 상태/코드/details를 보존한다', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
  globalThis.fetch = async () => new Response(JSON.stringify({ error: {
    code: 'RESULT_NOT_READY', message: '집계 중', details: { status: 'PENDING' },
  } }), { status: 409 });
  await assert.rejects(apiRequest('/v1/test', { auth: 'public' }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 409);
    assert.equal(error.code, 'RESULT_NOT_READY');
    assert.deepEqual(error.details, { status: 'PENDING' });
    return true;
  });
});

test('네트워크 실패/JSON 오류/취소를 구분한다', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
  globalThis.fetch = async () => { throw new TypeError('failed'); };
  await assert.rejects(apiRequest('/v1/test', { auth: 'public' }), { code: 'NETWORK_ERROR' });
  globalThis.fetch = async () => new Response('<html>bad gateway</html>', { status: 502 });
  await assert.rejects(apiRequest('/v1/test', { auth: 'public' }), { code: 'INVALID_RESPONSE' });
  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = async () => { throw new DOMException('aborted', 'AbortError'); };
  await assert.rejects(apiRequest('/v1/test', { auth: 'public', signal: controller.signal }), { name: 'AbortError' });
});

test('다른 호스트를 가리키는 경로는 거부한다', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
  await assert.rejects(apiRequest('//external.example/test', { auth: 'public' }), { code: 'INVALID_API_URL' });
});
