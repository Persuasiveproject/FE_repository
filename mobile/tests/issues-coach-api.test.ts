import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCoach, parsePublicIssues } from '../src/services/public-debate-api.ts';
import { createMockGateway } from '../src/services/mock-gateway.ts';

test('쟁점 정리: 답글 근거는 원래 의견으로 잇고, 한쪽만 있으면 답 기다리는 쪽을 둔다', () => {
  const map = parsePublicIssues({ data: { createdAt: '2026-11-25T03:00:00Z', issues: [
    { title: '학습 효과', awaiting: null,
      pro: { text: '찬성 주장', sources: [{ postId: '12', rootPostId: null }] },
      con: { text: '반대 주장', sources: [{ postId: '18', rootPostId: '12' }, { postId: '20', rootPostId: '12' }] } },
    { title: '비용', awaiting: 'CON', pro: { text: '찬성만', sources: [{ postId: '3', rootPostId: null }] }, con: null },
    { title: '근거 없음', awaiting: 'PRO', pro: null, con: { text: 'x', sources: [] } },
  ] } });
  assert.equal(map.createdAt, '2026-11-25T03:00:00Z');
  assert.deepEqual(map.issues.map((i) => i.title), ['학습 효과', '비용']);
  assert.deepEqual(map.issues[0].con?.opinionIds, ['12']);
  assert.equal(map.issues[1].awaiting, 'CON');
  assert.deepEqual(parsePublicIssues({ data: { issues: [], createdAt: null } }), { createdAt: null, issues: [] });
});

test('작성 코치: 쓸 수 있는 제안만 SUGGEST, 이상한 응답은 UNAVAILABLE', () => {
  assert.deepEqual(parseCoach({ data: { verdict: 'SUGGEST', reasons: ['ATTACK', 'X'], suggestion: ' 바꾼 글 ' } }),
    { verdict: 'SUGGEST', reasons: ['ATTACK'], suggestion: '바꾼 글' });
  assert.equal(parseCoach({ data: { verdict: 'SUGGEST', reasons: ['X'], suggestion: '글' } }).verdict, 'UNAVAILABLE');
  assert.equal(parseCoach({ data: { verdict: 'OK', reasons: [], suggestion: null } }).verdict, 'OK');
  assert.equal(parseCoach({}).verdict, 'UNAVAILABLE');
});

test('데모 모드: 끝장토론 쟁점 정리와 작성 코치가 화면 계약대로 동작한다', async () => {
  const gateway = createMockGateway();
  await gateway.signInDemo();
  await gateway.joinDebate('ai-class', 'CON');
  const map = await gateway.getIssues!('ai-class');
  assert.ok(map.issues.some((issue) => issue.awaiting === 'PRO' && !issue.pro));
  const rude = await gateway.coachOpinion!({ debateId: 'ai-class', content: '찬성하는 사람들은 생각이 없다. 기초 없이 쓰면 배울 수 없다.' });
  assert.equal(rude.verdict, 'SUGGEST');
  assert.equal(rude.suggestion, '기초 없이 쓰면 배울 수 없다.');
  assert.equal((await gateway.coachOpinion!({ debateId: 'ai-class', content: '기초 없이 쓰면 배울 수 없다고 생각해요.' })).verdict, 'OK');
});
