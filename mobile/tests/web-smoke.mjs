import assert from 'node:assert/strict';

// 먼저 npm run web -- --port 8082로 서버를 실행합니다.
const base = process.env.WEB_TEST_URL || 'http://localhost:8082';
const cases = [
  ['/', '지금, 생각이 모이는 곳'],
  ['/discussions', '토론 목록'],
  ['/discussions/1', '토론'],
  ['/discussions/2', '토론'],
  ['/discussions/ai-class', '토론'],
  ['/discussions/create', '토론 만들기'],
  ['/joined', '참여 중'],
  ['/my', '마이'],
  ['/explore', 'Explore'],
  ['/auth/login', '로그인'],
  ['/auth/phone', '휴대폰 확인'],
  ['/auth/signup', '회원가입'],
  ['/discussions/ai-class/join', '입장 선택'],
  ['/discussions/ai-class/vote', '투표 · 입장 변경'],
  ['/discussions/ai-class/opinion', '의견 작성'],
  ['/discussions/ai-class/threads/ai-class-op-1', '의견과 반박'],
  ['/discussions/ai-class/reply/ai-class-op-1', '답글 · 반박 작성'],
  ['/discussions/closed-demo', '토론'],
  ['/discussions/closed-demo/results', '최종 통계'],
  ['/discussions/ai-class/summary', 'AI 요약'],
  ['/account/profile', '프로필 수정'],
  ['/account/coins', '코인 관리'],
  ['/account/credits', '크레딧과 배지'],
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
