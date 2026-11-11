import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { getPublicSummary, parsePublicSummary } from '../src/services/public-debate-api.ts';

const originalFetch = globalThis.fetch;
const originalBase = process.env.EXPO_PUBLIC_API_BASE_URL;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalBase === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
  else process.env.EXPO_PUBLIC_API_BASE_URL = originalBase;
});

const row = (stance: string, createdAt: string) => ({ stance, summaryText: `- ${stance} 요약`, sourcePostIds: ['12', '9007199254740993'], createdAt });

test('API 43 요약을 찬성·반대 섹션으로 바꾸고 최신 생성 시각을 쓴다', () => {
  const summary = parsePublicSummary({ data: { summaries: [row('PRO', '2026-11-10T10:00:00Z'), row('CON', '2026-11-10T10:05:00Z')] } });
  assert.equal(summary.generatedAt, '2026-11-10T10:05:00Z');
  assert.deepEqual(summary.sections.map((s) => s.title), ['찬성 핵심 근거', '반대 핵심 근거']);
  assert.deepEqual(summary.sections[0].opinionIds, ['12', '9007199254740993']);
});

test('요약이 없으면 빈 섹션과 null 시각', () => {
  assert.deepEqual(parsePublicSummary({ data: { summaries: [] } }), { generatedAt: null, sections: [] });
});

test('요약 시각의 소수점 유무와 원문 중복을 정리하고 입장별 시각을 보존한다', () => {
  const summary = parsePublicSummary({ data: { summaries: [
    { ...row('PRO', '2026-11-10T10:00:00Z'), sourcePostIds: ['12', '12'] },
    row('CON', '2026-11-10T10:00:00.100Z'),
  ] } });
  assert.equal(summary.generatedAt, '2026-11-10T10:00:00.100Z');
  assert.equal(summary.sections[0].generatedAt, '2026-11-10T10:00:00Z');
  assert.deepEqual(summary.sections[0].opinionIds, ['12']);
});

test('NEUTRAL·중복 입장·잘못된 ID는 거부한다', () => {
  assert.throws(() => parsePublicSummary({ data: { summaries: [row('NEUTRAL', '2026-11-10T10:00:00Z')] } }));
  assert.throws(() => parsePublicSummary({ data: { summaries: [row('PRO', '2026-11-10T10:00:00Z'), row('PRO', '2026-11-10T10:00:00Z')] } }));
  assert.throws(() => parsePublicSummary({ data: { summaries: [{ ...row('PRO', '2026-11-10T10:00:00Z'), sourcePostIds: [12] }] } }));
});

test('요약 API 경로와 404 메시지', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://api.test';
  let url = '';
  globalThis.fetch = (async (input: string) => { url = input; return new Response(JSON.stringify({ data: { summaries: [] } }), { status: 200 }); }) as typeof fetch;
  await getPublicSummary('7');
  assert.equal(url, 'http://api.test/v1/debates/7/summary');
  globalThis.fetch = (async () => new Response(JSON.stringify({ error: { code: 'DEBATE_NOT_FOUND', message: 'x' } }), { status: 404 })) as typeof fetch;
  await assert.rejects(getPublicSummary('7'), { code: 'DEBATE_NOT_FOUND', message: '토론을 찾을 수 없습니다.' });
});
