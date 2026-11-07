import assert from 'node:assert/strict';

// 먼저 npm run web -- --port 8082로 서버를 실행합니다.
const base = process.env.WEB_TEST_URL || 'http://localhost:8082';
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
    for (const label of ['Expo Starter', 'Home', 'Explore', 'Docs', '참여 중', '만들기', '마이']) {
      assert.ok(html.includes(`>${label}<`), `기존/추가 툴바 항목 누락: ${label}`);
    }
    for (const href of ['/', '/explore', '/joined', '/my']) {
      assert.ok(html.includes(`href="${href}"`), `탭 경로 누락: ${href}`);
    }
  }
  if (path.startsWith('/discussions')) assert.ok(!html.includes('role="tab"'), `${path}: 불필요한 탭 노출`);
  console.log(`PASS ${path}: HTTP 200, 제목 및 화면 구조`);
}
