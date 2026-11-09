import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { appendPostPage, getPublicDetail, getPublicHomeFeed, getPublicPosts, getPublicThread, getRecentPublicPost, parsePublicDetail, parsePublicHome, parsePublicPosts, toOpinionCard } from '../src/services/public-debate-api.ts';

const originalFetch = globalThis.fetch;
const originalBase = process.env.EXPO_PUBLIC_API_BASE_URL;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalBase === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
  else process.env.EXPO_PUBLIC_API_BASE_URL = originalBase;
});
const time = '2026-11-09T12:00:00Z';
const listItem = { id: '9007199254740993', kind: 'ENDLESS', title: '토론', categoryId: '2', status: 'OPEN', createdAt: time,
  participantCount: 30, opinionCount: 2, viewCount: 1, startedAt: time, endsAt: null, closedAt: null, canceledAt: null };
const detail = (changes: Record<string, unknown> = {}) => ({ data: {
  debate: { ...listItem, content: '실제 주제 설명', category: { id: '2', name: '기술', sortOrder: 0 }, durationMinutes: null, ...changes },
  participantCount: changes.participantCount ?? 30, images: [], myParticipation: null,
} });
const post = (changes: Record<string, unknown> = {}) => ({
  postId: '9223372036854775807', debateId: listItem.id, parentId: null, rootId: null,
  stanceAtWrite: 'CON', status: 'VISIBLE', anonymousNo: 17, content: '신중한 검토가 필요해요.',
  upvoteCount: 11, downvoteCount: 3, persuasionCount: 1, replyCount: 21, createdAt: time, updatedAt: time,
  references: [], badge: null, ...changes,
});
const page = (items: unknown[], cursor: string | null = null, key = 'posts') => ({ data: { [key]: items }, meta: { nextCursor: cursor } });

test('홈 API의 실제 인기·추천 배열과 카테고리를 카드에 연결한다', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
  const calls: string[] = [];
  globalThis.fetch = async (url, options) => {
    const path = new URL(String(url)).pathname; calls.push(path);
    assert.equal(options?.credentials, 'omit');
    return Response.json(path === '/v1/categories' ? { data: { categories: [{ id: '2', name: '기술', sortOrder: 0 }] } }
      : { data: { popularDebates: [listItem], recommendedDebates: [] } });
  };
  const feed = await getPublicHomeFeed();
  assert.deepEqual(calls.sort(), ['/v1/categories', '/v1/home']);
  assert.equal(feed.popular[0].id, listItem.id);
  assert.equal(feed.popular[0].category, '기술');
  assert.equal(feed.popular[0].description, '');
  assert.deepEqual(feed.recommended, []);
});
test('홈 빈 응답을 유지하며 잘못된 배열과 서버 실패를 데모로 대체하지 않는다', async () => {
  assert.deepEqual(parsePublicHome({ data: { popularDebates: [], recommendedDebates: [] } }), { popularDebates: [], recommendedDebates: [] });
  assert.throws(() => parsePublicHome({ data: { popularDebates: null, recommendedDebates: [] } }), { code: 'INVALID_RESPONSE' });
  assert.throws(() => parsePublicHome({ data: { popularDebates: [listItem] } }), { code: 'INVALID_RESPONSE' });
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
  globalThis.fetch = async () => Response.json({ error: { code: 'UNAVAILABLE', message: '점검 중' } }, { status: 503 });
  await assert.rejects(getPublicHomeFeed(), { code: 'UNAVAILABLE', status: 503 });
});
test('상세의 실제 본문·카테고리·큰 ID·미정 마감 시각을 보존한다', () => {
  const parsed = parsePublicDetail(detail());
  assert.equal(parsed.id, listItem.id);
  assert.equal(parsed.content, '실제 주제 설명');
  assert.equal(parsed.category.name, '기술');
  assert.equal(parsed.endsAt, null);
  assert.equal(parsed.durationMinutes, null);
  assert.ok(!('creatorId' in parsed));
});
test('상세의 비공개 상태·참여 수 충돌·잘못된 필수 시각을 거부한다', () => {
  for (const changes of [{ status: 'DRAFT' }, { status: 'CANCELED' }, { endsAt: undefined }, { createdAt: 'bad' }, { kind: 'UNKNOWN' }]) {
    assert.throws(() => parsePublicDetail(detail(changes)), { code: 'INVALID_RESPONSE' });
  }
  const conflict = detail(); conflict.data.participantCount = 31;
  assert.throws(() => parsePublicDetail(conflict), { code: 'INVALID_RESPONSE' });
});
test('데모 ID·경로 삽입·범위를 벗어난 ID는 네트워크 전에 거부한다', async () => {
  globalThis.fetch = async () => { throw new Error('요청하면 안 됨'); };
  for (const value of ['ai-class', '../me', '0', '9223372036854775808']) {
    await assert.rejects(getPublicDetail(value), { code: 'INVALID_ID' });
    await assert.rejects(getPublicPosts(value), { code: 'INVALID_ID' });
  }
  await assert.rejects(getPublicThread('1', 'demo-op'), { code: 'INVALID_ID' });
});
test('상세 응답의 토론 ID를 확인하고 404는 코드를 유지한 한국어 안내로 바꾼다', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(String(url)).pathname, `/v1/debates/${listItem.id}`);
    assert.equal(options?.method, 'GET');
    assert.equal(options?.credentials, 'omit');
    return Response.json(detail());
  };
  assert.equal((await getPublicDetail(listItem.id)).id, listItem.id);
  globalThis.fetch = async () => Response.json(detail({ id: '2' }));
  await assert.rejects(getPublicDetail(listItem.id), { code: 'INVALID_RESPONSE' });
  globalThis.fetch = async () => Response.json({ error: { code: 'DEBATE_NOT_FOUND', message: 'Debate not found.' } }, { status: 404 });
  await assert.rejects(getPublicDetail(listItem.id), { code: 'DEBATE_NOT_FOUND', status: 404, message: '토론을 찾을 수 없습니다.' });
});
test('의견 카드에는 익명 번호·표수만 옮기며 작성자 ID와 내 투표를 만들지 않는다', () => {
  const parsed = parsePublicPosts(page([post()]), listItem.id);
  const card = toOpinionCard(parsed.items[0]);
  assert.equal(card.authorName, '익명 17');
  assert.equal(card.upvotes - card.downvotes, 8);
  assert.equal(card.id, '9223372036854775807');
  assert.ok(!('authorId' in card)); assert.ok(!('myVote' in card));
});
test('다른 토론·다른 부모·숨겨진 글·잘못된 입장과 숫자를 거부한다', () => {
  for (const changes of [{ debateId: '2' }, { parentId: '3' }, { status: 'HIDDEN' }, { stanceAtWrite: 'UNKNOWN' }, { anonymousNo: 0 }, { upvoteCount: '11' }]) {
    assert.throws(() => parsePublicPosts(page([post(changes)]), listItem.id), { code: 'INVALID_RESPONSE' });
  }
  assert.throws(() => parsePublicPosts(page([post({ parentId: '8' })], null, 'replies'), listItem.id, '7'), { code: 'INVALID_RESPONSE' });
});
test('의견 입장·정렬·cursor는 서버에 전달하고 마지막 페이지를 구분한다', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
  const controller = new AbortController();
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(String(url));
    assert.equal(parsed.pathname, `/v1/debates/${listItem.id}/posts`);
    assert.equal(parsed.searchParams.get('stance'), 'CON');
    assert.equal(parsed.searchParams.get('sort'), 'upvotes');
    assert.equal(parsed.searchParams.get('cursor'), 'opaque+/= &');
    assert.equal(options?.signal, controller.signal);
    return Response.json(page([post()]));
  };
  const result = await getPublicPosts(listItem.id, { stance: 'CON', sort: 'upvotes', cursor: 'opaque+/= &' }, controller.signal);
  assert.equal(result.nextCursor, null);
  assert.equal(getRecentPublicPost(listItem.id, post().postId)?.content, post().content);
  assert.equal(getRecentPublicPost('2', post().postId), undefined);
});
test('답글은 실제 posts/thread 경로를 쓰고 직계 부모 관계와 빈 페이지를 보존한다', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls++;
    const parsed = new URL(String(url));
    assert.equal(parsed.pathname, '/v1/posts/7/thread');
    assert.equal(parsed.searchParams.get('cursor'), 'next+/=');
    assert.equal(parsed.searchParams.get('stance'), null);
    return Response.json(page([post({ postId: '8', parentId: '7', rootId: '7' })], null, 'replies'));
  };
  const replies = await getPublicThread(listItem.id, '7', 'next+/=');
  assert.equal(calls, 1);
  assert.equal(replies.items[0].parentId, '7');
  assert.deepEqual(parsePublicPosts(page([], null, 'replies'), listItem.id, '7'), { items: [], nextCursor: null });
});
test('다음 의견 페이지의 중복 글은 갱신하고 cursor 순환을 차단한다', () => {
  const first = parsePublicPosts(page([post()], 'cursor-a'), listItem.id);
  const second = parsePublicPosts(page([post({ upvoteCount: 12 }), post({ postId: '8' })]), listItem.id);
  const merged = appendPostPage(first.items, second, ['cursor-a']);
  assert.equal(merged.length, 2); assert.equal(merged[0].upvoteCount, 12);
  assert.throws(() => appendPostPage(merged, first, ['cursor-a']), { code: 'INVALID_RESPONSE' });
});
