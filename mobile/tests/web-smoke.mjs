import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

// 먼저 npm run web -- --port 8082로 서버를 실행합니다.
const base = process.env.WEB_TEST_URL || 'http://localhost:8082';
// expo-image의 실제 이미지 로딩은 브라우저 마운트 후입니다. 여기서는 원본 파일과 연결만 검사합니다.
const tabSource = await readFile(new URL('../src/components/home-tabs.tsx', import.meta.url), 'utf8');
for (const icon of ['home', 'joined', 'create', 'profile']) {
  const file = new URL(`../assets/icons/${icon}.svg`, import.meta.url);
  assert.ok((await stat(file)).size > 0, `빈 아이콘: ${icon}`);
  const svg = await readFile(file, 'utf8');
  assert.ok(/<svg[^>]*width="24"[^>]*height="24"/.test(svg), `아이콘 원본 크기: ${icon}`);
  assert.ok(tabSource.includes(`@/assets/icons/${icon}.svg`), `아이콘 연결 누락: ${icon}`);
}
const cases = [
  ['/', '지금, 생각이 모이는 곳'],
  ['/discussions', '토론 목록'],
  ['/discussions/1', '토론 상세 · 1'],
  ['/discussions/2', '토론 상세 · 2'],
  ['/discussions/ai-class', '토론 상세 · ai-class'],
  ['/discussions/create', '토론 만들기'],
  ['/joined', '참여 중'],
  ['/my', '마이'],
  ['/explore', 'Explore'],
];
for (const [path, title] of cases) {
  const response = await fetch(`${base}${path}`);
  assert.equal(response.status, 200, path);
  const html = await response.text();
  assert.ok(html.includes(title), `${path}: 제목 누락`);
  assert.ok(!html.includes('SSR streaming render error'), `${path}: SSR 오류`);
  if (path === '/') {
    assert.equal((html.match(/role="tab"/g) ?? []).length, 3, '홈·참여 중·마이만 실제 탭이어야 함');
    assert.equal((html.match(/data-expoimage="true"[^>]*width:24px;height:24px/g) ?? []).length, 4, '아이콘 슬롯 4개의 SSR 크기는 24×24여야 함');
    assert.ok(html.includes('+ 만들기'), '생성 버튼 누락');
  }
  if (path.startsWith('/discussions')) assert.ok(!html.includes('role="tab"'), `${path}: 불필요한 탭 노출`);
  console.log(`PASS ${path}: HTTP 200, 제목 및 화면 구조`);
}
