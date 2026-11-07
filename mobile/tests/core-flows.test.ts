import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMockGateway } from '../src/services/mock-gateway.ts';
import { validateDebate, validateOpinion, validateProfile } from '../src/features/core/rules.ts';
import type { CreateDebateInput } from '../src/types/core.ts';

const input: CreateDebateInput = { category: '기술', kind: 'QUICK', durationMinutes: 5, title: '새 토론 질문', content: '함께 논의할 내용입니다.' };

test('guest는 읽기만 가능하고 참여/게시/프로필/참여 목록은 인증을 요구한다', async () => {
  const gateway = createMockGateway();
  assert.ok((await gateway.listDebates()).length >= 4);
  assert.equal((await gateway.getDebate('ai-class')).membership, null);
  await assert.rejects(gateway.createDebate(input, 'c1'), { code: 'AUTH_REQUIRED' });
  await assert.rejects(gateway.joinDebate('ai-class', 'PRO'), { code: 'AUTH_REQUIRED' });
  await assert.rejects(gateway.listJoined('OPEN'), { code: 'AUTH_REQUIRED' });
  await assert.rejects(gateway.getWallet(), { code: 'AUTH_REQUIRED' });
});

test('가입/수정은 trim과 필수 확인/관심 주제 검증을 적용하고 로그아웃하면 보호 기능을 차단한다', async () => {
  const gateway = createMockGateway();
  await assert.rejects(gateway.signUpDemo({ nickname: '  ', interests: [], termsAccepted: true, privacyAccepted: true }), { code: 'VALIDATION_ERROR' });
  const user = await gateway.signUpDemo({ nickname: '  토론하는 사람 ', interests: ['기술'], termsAccepted: true, privacyAccepted: true });
  assert.equal(user.nickname, '토론하는 사람');
  await gateway.updateProfile({ nickname: '새 이름', interests: ['경제'] });
  assert.equal((await gateway.getSession())?.nickname, '새 이름');
  await gateway.signOut();
  assert.equal(await gateway.getSession(), null);
  await assert.rejects(gateway.listJoined('OPEN'), { code: 'AUTH_REQUIRED' });
});

test('생성 요청을 재시도해도 토론/코인은 한 번만 생성·차감하고 세션과 지갑에 반영한다', async () => {
  const gateway = createMockGateway();
  await gateway.signInDemo();
  const first = await gateway.createDebate(input, 'create-one');
  const repeated = await gateway.createDebate(input, 'create-one');
  assert.equal(first.id, repeated.id);
  assert.equal((await gateway.getSession())?.coins, 9);
  assert.equal((await gateway.getWallet()).transactions.filter((entry) => entry.amount < 0).length, 1);
  assert.equal((await gateway.listDebates()).filter((item) => item.id === first.id).length, 1);
  await gateway.createDebate(input, 'create-two'); await gateway.createDebate(input, 'create-three');
  await assert.rejects(gateway.createDebate(input, 'create-four'), { code: 'CREATE_LIMIT' });
});

test('중복 참여는 인원을 늘리지 않고 의견/답글은 작성 당시 입장과 부모 관계를 보존한다', async () => {
  const gateway = createMockGateway();
  await gateway.signInDemo();
  const before = await gateway.getDebate('ai-class');
  await gateway.joinDebate('ai-class', 'PRO'); await gateway.joinDebate('ai-class', 'CON');
  assert.equal((await gateway.getDebate('ai-class')).participants, before.participants + 1);
  const own = await gateway.postOpinion({ debateId: 'ai-class', content: '찬성 의견' }, 'p1');
  const repeated = await gateway.postOpinion({ debateId: 'ai-class', content: '찬성 의견' }, 'p1');
  assert.equal(own.id, repeated.id);
  const reply = await gateway.postOpinion({ debateId: 'ai-class', parentId: 'ai-class-op-1', content: '답글 의견' }, 'reply-one');
  assert.equal(reply.parentId, 'ai-class-op-1');
  assert.equal((await gateway.getOpinion('ai-class', 'ai-class-op-1')).replyCount, 2);
  await gateway.changeStance({ debateId: 'ai-class', stance: 'CON', version: 0 });
  assert.equal((await gateway.getOpinion('ai-class', own.id)).stance, 'PRO');
  assert.equal((await gateway.getDebate('ai-class')).membership?.initialStance, 'PRO');
  assert.equal((await gateway.listJoined('OPEN')).length, 1);
});

test('미참여자·빈 글·다른 토론의 부모·과도한 답글 깊이를 구분한다', async () => {
  const gateway = createMockGateway(); await gateway.signInDemo();
  await assert.rejects(gateway.postOpinion({ debateId: 'ai-class', content: '의견' }, 'a'), { code: 'NOT_PARTICIPANT' });
  await gateway.joinDebate('ai-class', 'PRO');
  await assert.rejects(gateway.postOpinion({ debateId: 'ai-class', content: '  ' }, 'b'), { code: 'VALIDATION_ERROR' });
  await assert.rejects(gateway.postOpinion({ debateId: 'ai-class', parentId: '1-op-1', content: '글' }, 'c'), { code: 'NOT_FOUND' });
  await assert.rejects(gateway.postOpinion({ debateId: 'ai-class', parentId: 'ai-class-reply-1', content: '글' }, 'd'), { code: 'REPLY_DEPTH' });
});

test('추천/비추천은 전환·취소가 가능하며 자기 글 투표를 막는다', async () => {
  const gateway = createMockGateway(); await gateway.signInDemo(); await gateway.joinDebate('ai-class', 'PRO');
  const first = await gateway.voteOpinion('ai-class', 'ai-class-op-1', 'UP');
  assert.equal(first.upvotes, 22);
  const second = await gateway.voteOpinion('ai-class', 'ai-class-op-1', 'DOWN');
  assert.equal(second.upvotes, 21); assert.equal(second.downvotes, 1);
  const canceled = await gateway.voteOpinion('ai-class', 'ai-class-op-1', 'DOWN');
  assert.equal(canceled.myVote, null); assert.equal(canceled.downvotes, 0);
  const own = await gateway.postOpinion({ debateId: 'ai-class', content: '내 글' }, 'own');
  await assert.rejects(gateway.voteOpinion('ai-class', own.id, 'UP'), { code: 'SELF_VOTE' });
});

test('입장 버전 충돌·자기 글 근거·동일 입장 변경을 차단한다', async () => {
  const gateway = createMockGateway(); await gateway.signInDemo(); await gateway.joinDebate('ai-class', 'PRO');
  const own = await gateway.postOpinion({ debateId: 'ai-class', content: '내 글' }, 'own');
  await assert.rejects(gateway.changeStance({ debateId: 'ai-class', stance: 'CON', version: 0, opinionId: own.id }), { code: 'SELF_REFERENCE' });
  await assert.rejects(gateway.changeStance({ debateId: 'ai-class', stance: 'PRO', version: 0 }), { code: 'SAME_STANCE' });
  const member = await gateway.changeStance({ debateId: 'ai-class', stance: 'CON', version: 0, opinionId: 'ai-class-op-2' });
  assert.equal(member.version, 1);
  await assert.rejects(gateway.changeStance({ debateId: 'ai-class', stance: 'NEUTRAL', version: 0 }), { code: 'STANCE_CONFLICT' });
});

test('마감 시간 이후에는 참여/작성/투표/입장 변경을 차단하고 종료 목록으로 이동한다', async () => {
  let clock = Date.UTC(2026, 10, 8);
  const gateway = createMockGateway({ now: () => clock }); await gateway.signInDemo();
  const debate = await gateway.createDebate(input, 'quick'); await gateway.joinDebate(debate.id, 'PRO');
  clock += 5 * 60000;
  assert.equal((await gateway.getDebate(debate.id)).status, 'CLOSED');
  assert.ok((await gateway.listJoined('CLOSED')).some((item) => item.id === debate.id));
  await assert.rejects(gateway.joinDebate(debate.id, 'CON'), { code: 'DEBATE_CLOSED' });
  await assert.rejects(gateway.postOpinion({ debateId: debate.id, content: '늦은 글' }, 'late'), { code: 'DEBATE_CLOSED' });
  await assert.rejects(gateway.changeStance({ debateId: debate.id, stance: 'CON', version: 0 }), { code: 'DEBATE_CLOSED' });
  await assert.rejects(gateway.voteOpinion(debate.id, 'unused', 'UP'), { code: 'DEBATE_CLOSED' });
  const result = await gateway.getResults(debate.id);
  assert.equal(result.total, 1); assert.equal(result.final.PRO, 1); assert.equal(result.changed, null);
});

test('열린 토론 결과를 숨기고 종료 예시의 전체·입장·흐름 합계와 개인정보 비공개를 보장한다', async () => {
  const gateway = createMockGateway();
  await assert.rejects(gateway.getResults('ai-class'), { code: 'RESULT_NOT_READY' });
  const result = await gateway.getResults('closed-demo');
  assert.equal(Object.values(result.final).reduce((a, b) => a + b, 0), result.total);
  assert.equal(result.transitions.reduce((sum, entry) => sum + entry.count, 0), result.total);
  assert.equal(result.changed! + result.kept!, result.total);
  assert.equal(result.demographics, null);
  await assert.rejects(gateway.getDebate('missing'), { code: 'NOT_FOUND' });
});

test('API 모드는 Mock으로 대체하지 않고 연결 미완료 오류를 반환한다', async () => {
  const gateway = createMockGateway({ enabled: false });
  await assert.rejects(gateway.signInDemo(), { code: 'INTEGRATION_PENDING' });
  await assert.rejects(gateway.listDebates(), { code: 'INTEGRATION_PENDING' });
});

test('기존 예시 토론이 마감되어도 최종 입장 합계에 기존 참여자와 새 참여자를 함께 반영한다', async () => {
  let clock = Date.UTC(2026, 10, 8);
  const gateway = createMockGateway({ now: () => clock });
  await gateway.signInDemo();
  await gateway.joinDebate('ai-class', 'NEUTRAL');
  await gateway.changeStance({ debateId: 'ai-class', stance: 'CON', version: 0 });
  clock += 72 * 3600000;
  const result = await gateway.getResults('ai-class');
  assert.equal(Object.values(result.final).reduce((sum, value) => sum + value, 0), result.total);
});

test('입력 길이·시간 범위·관심 주제 검증은 UI와 service에서 같은 규칙을 사용한다', () => {
  assert.equal(validateDebate(input), null);
  assert.ok(validateDebate({ ...input, durationMinutes: 4 }));
  assert.ok(validateDebate({ ...input, title: 'x'.repeat(101) }));
  assert.ok(validateOpinion('x'.repeat(1001)));
  assert.ok(validateProfile({ nickname: '이름', interests: ['없는 주제'], termsAccepted: true, privacyAccepted: true }));
});
