// 읽기 전용 진단입니다. 서버 데이터 생성·수정·삭제나 로그인은 수행하지 않습니다.
import { getPublicCategories, getPublicDebates } from '../src/services/public-api.ts';
import { getPublicDetail, getPublicHomeFeed, getPublicPosts, getPublicThread } from '../src/services/public-debate-api.ts';

process.env.EXPO_PUBLIC_API_BASE_URL ||= 'https://dev-api.yeongup.shop';
const base = process.env.EXPO_PUBLIC_API_BASE_URL.replace(/\/$/, '');
const origin = process.env.API_CHECK_WEB_ORIGIN || 'http://localhost:8082';
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15000);
try {
  const [categories, open, closed, home, health, cors] = await Promise.all([
    getPublicCategories(controller.signal),
    getPublicDebates({ status: 'OPEN' }, controller.signal),
    getPublicDebates({ status: 'CLOSED' }, controller.signal),
    getPublicHomeFeed(controller.signal),
    fetch(`${base}/health/`, { signal: controller.signal }),
    fetch(`${base}/v1/categories`, { signal: controller.signal, headers: { Origin: origin } }),
  ]);
  if (!health.ok || !cors.ok) throw new Error(`서버 상태 오류: health=${health.status}, categories=${cors.status}`);
  console.log(`서버: ${base}`);
  console.log(`PASS 공개 응답/DTO: categories=${categories.length}, OPEN=${open.data.debates.length}, CLOSED=${closed.data.debates.length}`);
  console.log(`PASS 홈 응답/DTO: popular=${home.popular.length}, recommended=${home.recommended.length}`);
  const target = open.data.debates[0]?.id ?? closed.data.debates[0]?.id ?? home.popular[0]?.id ?? home.recommended[0]?.id;
  if (target) {
    const [detail, posts] = await Promise.all([getPublicDetail(target, controller.signal), getPublicPosts(target, {}, controller.signal)]);
    console.log(`PASS 공개 상세·의견: debate=${detail.id}, posts=${posts.items.length}`);
    if (posts.items[0]) {
      const replies = await getPublicThread(target, posts.items[0].postId, undefined, controller.signal);
      console.log(`PASS 답글 응답/DTO: replies=${replies.items.length}`);
    } else console.log('보류: 서버 의견이 없어 답글 실데이터 검증은 수행하지 않았습니다.');
  } else console.log('보류: 서버 토론이 없어 상세·의견·답글 실데이터 검증은 수행하지 않았습니다.');
  console.log('빈 응답은 성공입니다. 비어 있는 서버에는 목록 카드가 없습니다.');
  const allowed = cors.headers.get('access-control-allow-origin');
  if (allowed === '*' || allowed === origin) console.log(`PASS 공개 GET CORS 헤더: ${allowed}`);
  else console.log(`주의: ${origin}의 공개 GET을 허용하는 CORS 헤더가 없습니다. 웹 연결은 BE 설정 후 브라우저에서 확인하세요.`);
} finally {
  clearTimeout(timeout);
}
