import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { ApiError } from '../src/services/api-client.ts';
import { clearBasicAuth, makeBasicHeader } from '../src/services/basic-auth.ts';
import { createHttpGateway } from '../src/services/http-gateway.ts';
import { deleteOpinionReaction, parseOpinionReaction, putOpinionReaction, readOpinionReactionCounts } from '../src/services/opinion-reaction-api.ts';
import { createReactionController, reactionBlockReason } from '../src/services/opinion-reaction-controller.ts';
import { nextPostRevision } from '../src/services/post-observation.ts';
import { getPublicPosts } from '../src/services/public-debate-api.ts';
import type { OpinionReaction, OpinionReactionResult, ReactionAccess, ReactionTarget } from '../src/types/opinion-reaction';

const originalFetch = globalThis.fetch;
const savedEnv = { base: process.env.EXPO_PUBLIC_API_BASE_URL, enabled: process.env.EXPO_PUBLIC_OPINION_REACTIONS_ENABLED };
afterEach(() => {
  clearBasicAuth(); globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries({ EXPO_PUBLIC_API_BASE_URL: savedEnv.base, EXPO_PUBLIC_OPINION_REACTIONS_ENABLED: savedEnv.enabled })) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
const target: ReactionTarget = { debateId: '41', postId: '9223372036854775807', parentId: null };
const access: ReactionAccess = { signedIn: true, participant: true, own: false, closed: false };
const credentials = { memberId: '201', password: 'reaction-unit-fixture' };
const result = (reaction: OpinionReaction, upvoteCount = 8, downvoteCount = 3): OpinionReactionResult => ({ reaction, upvoteCount, downvoteCount });
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function controller(overrides: Partial<Parameters<typeof createReactionController>[0]> = {}) {
  return createReactionController({ enabled: () => true, put: async (_id, side) => result(side), remove: async () => {}, readCounts: async () => ({ upvoteCount: 7, downvoteCount: 3 }), ...overrides });
}
async function login() {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test'; process.env.EXPO_PUBLIC_OPINION_REACTIONS_ENABLED = 'true';
  const gateway = createHttpGateway();
  globalThis.fetch = async () => Response.json({ data: { id: credentials.memberId, status: 'ACTIVE', nickname: '테스트', credit: '0.000000', interests: [], badges: [] } });
  await gateway.signInBasic!(credentials); return gateway;
}
const time = '2026-11-18T01:00:00Z';
const post = (postId = target.postId, parentId: string | null = null) => ({ postId, parentId, rootId: parentId, debateId: '41', anonymousNo: 2, stanceAtWrite: 'CON', status: 'VISIBLE', content: '근거', createdAt: time, updatedAt: time, upvoteCount: 27, downvoteCount: 4, persuasionCount: 0, replyCount: 0 });
const page = (items = [post()], nextCursor: string | null = null, replies = false) => ({ data: { [replies ? 'replies' : 'posts']: items }, meta: { nextCursor } });

test('배포 설정은 기본 OFF이며 비로그인 요청과 잘못된 ID/반응은 전송 전에 차단한다', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test'; delete process.env.EXPO_PUBLIC_OPINION_REACTIONS_ENABLED;
  globalThis.fetch = async () => { throw new Error('네트워크 호출 금지'); };
  await assert.rejects(putOpinionReaction('1', 'UP'), { code: 'REACTIONS_NOT_ENABLED' });
  process.env.EXPO_PUBLIC_OPINION_REACTIONS_ENABLED = 'true';
  await assert.rejects(putOpinionReaction('1', 'UP'), { code: 'AUTH_REQUIRED' });
  await assert.rejects(deleteOpinionReaction('1'), { code: 'AUTH_REQUIRED' });
  await assert.rejects(putOpinionReaction('../me', 'UP'), { code: 'INVALID_ID' });
  await assert.rejects(putOpinionReaction('1', 'SIDE' as never), { code: 'INVALID_REACTION' });
});
test('PUT은 확인된 경로·본문·Basic 헤더를 쓰고 응답 표수를 그대로 반환한다', async () => {
  await login();
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), `https://api.example.test/v1/posts/${target.postId}/reaction`);
    assert.equal(options?.method, 'PUT'); assert.deepEqual(JSON.parse(String(options?.body)), { reaction: 'DOWN' });
    assert.equal(new Headers(options?.headers).get('authorization'), makeBasicHeader(credentials));
    assert.equal(new Headers(options?.headers).get('idempotency-key'), null);
    return Response.json({ data: result('DOWN', 32, 18) });
  };
  assert.deepEqual(await putOpinionReaction(target.postId, 'DOWN'), result('DOWN', 32, 18));
});
test('응답의 반응 불일치·누락·음수·숫자 문자열은 조용히 보정하지 않고 거절한다', () => {
  for (const data of [result('DOWN'), { ...result('UP'), upvoteCount: -1 }, { ...result('UP'), downvoteCount: '3' }, { reaction: 'UP' }, { ...result('UP'), reaction: null }]) {
    assert.throws(() => parseOpinionReaction({ data }, 'UP'), { code: 'INVALID_RESPONSE' });
  }
});
test('DELETE 204의 빈 본문을 처리하며 가짜 표수/취소 DTO를 요구하거나 만들지 않는다', async () => {
  await login();
  globalThis.fetch = async (_url, options) => { assert.equal(options?.method, 'DELETE'); assert.equal(options?.body, undefined); return new Response(null, { status: 204 }); };
  assert.equal(await deleteOpinionReaction('1'), undefined);
  globalThis.fetch = async () => Response.json({ data: { reaction: null } });
  await assert.rejects(deleteOpinionReaction('1'), { code: 'INVALID_RESPONSE' });
});
test('본인 글·미참여·마감 오류는 HTTP 상태와 코드를 보존하고 한국어로 안내한다', async () => {
  await login();
  for (const [status, code, word] of [[403, 'OWN_POST_REACTION', '내 글'], [403, 'NOT_PARTICIPANT', '참여'], [409, 'DEBATE_NOT_OPEN', '마감']] as const) {
    globalThis.fetch = async () => Response.json({ error: { code, message: 'backend' } }, { status });
    await assert.rejects(putOpinionReaction('1', 'UP'), (error: unknown) => { const e = error as ApiError; assert.equal(e.code, code); assert.equal(e.status, status); assert.ok(e.message.includes(word)); return true; });
  }
});
test('미배포 HTML 404를 서버 연결 완료나 Mock 성공으로 대체하지 않는다', async () => {
  await login(); globalThis.fetch = async () => new Response('<html>Not Found</html>', { status: 404 });
  await assert.rejects(putOpinionReaction('1', 'UP'), (error: unknown) => { const e = error as ApiError; assert.equal(e.status, 404); assert.ok(e.message.includes('배포')); return true; });
});
test('응답 본문 수신 중 끊긴 연결도 PUT·표수 조회 모두 재시도 가능한 오류로 안내한다', async () => {
  await login(); globalThis.fetch = async () => {
    const response = new Response(); response.text = async () => { throw new TypeError('connection terminated'); }; return response;
  };
  for (const operation of [() => putOpinionReaction('1', 'UP'), () => readOpinionReactionCounts(target)]) {
    await assert.rejects(operation(), (error: unknown) => { const e = error as ApiError; assert.equal(e.code, 'NETWORK_ERROR'); assert.ok(e.message.includes('다시 시도')); return true; });
  }
});
test('취소 후 본문 목록을 최신순으로 탐색해 서버 표수를 읽으며 cursor를 안전하게 전달한다', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test'; const calls: string[] = [];
  globalThis.fetch = async (url) => {
    const query = new URL(String(url)); calls.push(query.searchParams.get('cursor') ?? 'first'); assert.equal(query.pathname, '/v1/debates/41/posts'); assert.equal(query.searchParams.get('sort'), 'latest');
    return Response.json(query.searchParams.has('cursor') ? page() : page([], 'opaque+/='));
  };
  assert.deepEqual(await readOpinionReactionCounts(target), { upvoteCount: 27, downvoteCount: 4 }); assert.deepEqual(calls, ['first', 'opaque+/=']);
});
test('중첩 답글 취소 후에는 해당 직계 부모의 thread에서 표수를 읽는다', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
  globalThis.fetch = async (url) => { assert.equal(new URL(String(url)).pathname, '/v1/posts/91/thread'); return Response.json(page([post(target.postId, '91')], null, true)); };
  assert.equal((await readOpinionReactionCounts({ ...target, parentId: '91' })).upvoteCount, 27);
});
test('취소 표수 조회의 빈 목록·반복 cursor는 오류로 처리한다', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
  globalThis.fetch = async () => Response.json(page([]));
  await assert.rejects(readOpinionReactionCounts(target), { code: 'REACTION_COUNTS_UNAVAILABLE' });
  globalThis.fetch = async () => Response.json(page([], 'repeat'));
  await assert.rejects(readOpinionReactionCounts(target), { code: 'INVALID_RESPONSE' });
});
test('표수 페이지 조회 중 계정이 바뀌면 다음 페이지 요청을 보내지 않는다', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test'; let calls = 0;
  globalThis.fetch = async () => { calls++; clearBasicAuth(); return Response.json(page([], 'next')); };
  await assert.rejects(readOpinionReactionCounts(target), { code: 'SESSION_CHANGED' }); assert.equal(calls, 1);
});
test('최초 내 반응은 UNKNOWN이며 처음 클릭은 PUT, 반대 클릭은 변경, 같은 클릭은 DELETE한다', async () => {
  const writes: (OpinionReaction | null)[] = [];
  const store = controller({ put: async (_id, side) => { writes.push(side); return result(side, side === 'UP' ? 55 : 54, side === 'DOWN' ? 13 : 12); }, remove: async () => { writes.push(null); } });
  assert.equal(store.get(target).reaction, 'UNKNOWN');
  await store.press(target, 'UP', access); assert.equal(store.get(target).counts?.upvoteCount, 55);
  await store.press(target, 'DOWN', access); assert.equal(store.get(target).reaction, 'DOWN');
  await store.press(target, 'DOWN', access); assert.equal(store.get(target).reaction, null); assert.deepEqual(store.get(target).counts, { upvoteCount: 7, downvoteCount: 3 });
  assert.deepEqual(writes, ['UP', 'DOWN', null]);
});
test('조회되지 않는 이전 접속의 반응도 명시적 취소로 제거할 수 있다', async () => {
  let removes = 0; const store = controller({ remove: async () => { removes++; } });
  await store.cancel(target, access); assert.equal(removes, 1); assert.equal(store.get(target).reaction, null);
});
test('빠른 연속 클릭과 동일 글의 다른 화면 요청은 하나만 보내고 다른 글은 독립 처리한다', async () => {
  const wait = deferred<OpinionReactionResult>(); let puts = 0;
  const store = controller({ put: async (_id, side) => { puts++; return puts === 1 ? wait.promise : result(side); } });
  const first = store.press(target, 'UP', access);
  assert.equal(store.get(target).pending, true); assert.equal(await store.press({ ...target }, 'DOWN', access), false);
  assert.equal(await store.press({ ...target, postId: '2' }, 'DOWN', access), true); assert.equal(puts, 2);
  wait.resolve(result('UP')); await first; assert.equal(store.get(target).pending, false);
});
test('응답 유실 후 재시도는 최초 PUT 의도를 유지하고 DELETE 토글로 바뀌지 않는다', async () => {
  const writes: string[] = []; let calls = 0;
  const store = controller({ put: async (_id, side) => { writes.push(side); if (++calls === 1) throw new ApiError(0, 'NETWORK_ERROR', '연결 끊김'); return result(side); }, remove: async () => { throw new Error('DELETE 금지'); } });
  await store.press(target, 'UP', access); assert.ok(store.get(target).error); assert.equal(store.get(target).countsUnavailable, true);
  assert.equal(await store.press(target, 'DOWN', access), false);
  await store.retry(target, access); assert.deepEqual(writes, ['UP', 'UP']); assert.equal(store.get(target).reaction, 'UP'); assert.equal(store.get(target).error, '');
});
test('DELETE 응답 유실은 DELETE로 재시도하고 성공 뒤에만 표수를 조회한다', async () => {
  let deletes = 0; let reads = 0;
  const store = controller({ remove: async () => { if (++deletes === 1) throw new ApiError(0, 'NETWORK_ERROR', '유실'); }, readCounts: async () => { reads++; return { upvoteCount: 9, downvoteCount: 2 }; } });
  await store.cancel(target, access); assert.equal(reads, 0); assert.equal(store.get(target).retry?.phase, 'write');
  await store.retry(target, access); assert.equal(deletes, 2); assert.equal(reads, 1);
});
test('DELETE 성공 후 표수 조회만 실패하면 숫자를 추정하지 않고 GET만 재시도한다', async () => {
  let deletes = 0; let reads = 0;
  const store = controller({ remove: async () => { deletes++; }, readCounts: async () => { if (++reads === 1) throw new ApiError(0, 'NETWORK_ERROR', '조회 실패'); return { upvoteCount: 50, downvoteCount: 6 }; } });
  await store.cancel(target, access); assert.equal(store.get(target).reaction, null); assert.equal(store.get(target).countsUnavailable, true); assert.equal(store.get(target).retry?.phase, 'counts');
  await store.retry(target, { ...access, closed: true }); assert.equal(deletes, 1); assert.equal(reads, 2); assert.equal(store.get(target).countsUnavailable, false);
});
test('비로그인·미참여·본인 글·마감·기능 OFF는 쓰기를 전송하지 않는다', async () => {
  let calls = 0; const store = controller({ put: async (_id, side) => { calls++; return result(side); } });
  for (const policy of [{ ...access, signedIn: false }, { ...access, participant: false }, { ...access, own: true }, { ...access, closed: true }]) {
    assert.ok(reactionBlockReason(policy, true)); assert.equal(await store.press(target, 'UP', policy), false);
  }
  assert.equal(await controller({ enabled: () => false }).press(target, 'UP', access), false); assert.equal(calls, 0);
});
test('서버의 본인 글 거절과 마감 오류는 유지하며 마감은 같은 토론의 다른 카드에도 적용한다', async () => {
  const own = controller({ put: async () => { throw new ApiError(403, 'OWN_POST_REACTION', '내 글'); } });
  await own.press(target, 'UP', access); assert.equal(own.get(target).blocked, true); assert.equal(own.get(target).retry, null);
  const closed = controller({ put: async () => { throw new ApiError(409, 'DEBATE_NOT_OPEN', '마감'); } });
  await closed.press(target, 'UP', access); assert.equal(closed.isClosed('41'), true);
  assert.equal(await closed.press({ ...target, postId: '2' }, 'DOWN', access), false);
});
test('응답 유실 재시도 중 마감되면 쓰기는 중단하고 미확인 표수 조회만 허용한다', async () => {
  let puts = 0; const store = controller({ put: async () => { if (++puts === 1) throw new ApiError(0, 'NETWORK_ERROR', '유실'); throw new ApiError(409, 'DEBATE_NOT_OPEN', '마감'); } });
  await store.press(target, 'UP', access); await store.retry(target, access);
  assert.equal(store.get(target).retry?.phase, 'counts'); assert.equal(store.isClosed('41'), true);
  await store.retry(target, { ...access, closed: true }); assert.equal(puts, 2); assert.equal(store.get(target).countsUnavailable, false);
});
test('로그아웃/계정 교체로 reset한 뒤 도착한 이전 쓰기 응답은 새 계정 상태를 오염시키지 않는다', async () => {
  const wait = deferred<OpinionReactionResult>(); const store = controller({ put: async () => wait.promise });
  const pending = store.press(target, 'UP', access); store.reset(); wait.resolve(result('UP', 99, 98)); await pending;
  assert.equal(store.get(target).reaction, 'UNKNOWN'); assert.equal(store.get(target).counts, null); assert.equal(store.get(target).pending, false);
});
test('느린 이전 목록 응답은 반응 응답을 덮지 않고 이후 새 목록 응답은 표수를 갱신한다', async () => {
  const store = controller(); const oldRead = nextPostRevision();
  await store.press(target, 'UP', access); store.observe(target, { upvoteCount: 0, downvoteCount: 0 }, oldRead);
  assert.equal(store.get(target).counts?.upvoteCount, 8);
  store.observe(target, { upvoteCount: 12, downvoteCount: 5 }, nextPostRevision());
  assert.equal(store.get(target).counts?.upvoteCount, 12); assert.equal(store.get(target).reaction, 'UP');
});
test('공통 HTTP gateway의 기존 투표 함수도 Basic 반응 구현으로 연결된다', async () => {
  const gateway = await login();
  globalThis.fetch = async (url, options) => {
    const path = new URL(String(url)).pathname;
    if (path.endsWith('/reaction')) return Response.json({ data: result('UP', 22, 4) });
    if (path.endsWith('/posts')) return Response.json(page());
    assert.equal(options?.method, 'GET');
    return Response.json({ data: { debate: { id: '41', category: { id: '1', name: '주제', sortOrder: 0 }, kind: 'QUICK', title: '토론', content: '본문', status: 'OPEN', durationMinutes: 15, createdAt: time, startedAt: time, endsAt: time, closedAt: null, canceledAt: null, participantCount: 2 }, participantCount: 2, myParticipation: { participantId: '3', anonymousNo: 1, initialStance: 'PRO', currentStance: 'PRO', version: 0 } } });
  };
  await getPublicPosts('41'); const voted = await gateway.voteOpinion('41', target.postId, 'UP');
  assert.equal(voted.upvotes, 22); assert.equal(voted.downvotes, 4); assert.equal(voted.myVote, 'UP');
});
