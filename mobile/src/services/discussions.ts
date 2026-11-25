import { createMockHomeFeed } from '@/features/discussions/mock-discussions';
import type { Discussion, HomeFeed } from '@/types/discussion';
import { dataSource, gateway } from './gateway';
import { getPublicHomeFeed } from './public-debate-api';
import { getPublicCategories, getPublicDebates, toDiscussion } from './public-api';

export async function getHomeFeed(): Promise<HomeFeed> {
  if (dataSource === 'api') return getPublicHomeFeed();
  // 데모: 서버 홈처럼 손님 많은 순 상위 몇 개와 추천을 돌려준다.
  const feed = createMockHomeFeed();
  const all = (await gateway.listDebates()).filter((item) => item.status !== 'CLOSED');
  const popular = [...all].sort((a, b) => b.participants - a.participants).slice(0, 7);
  const recommended = all.filter((item) => !popular.slice(0, 5).some((p) => p.id === item.id)).slice(0, 3);
  return { popular, recommended: recommended.length ? recommended : [{ ...popular[0], description: feed.recommended[0].description }] };
}

// 지금 열려 있는 간단토론을 마감이 가까운 순서로. 서버의 방식 필터(kind=QUICK)와 마감 시각만 쓴다.
export async function getQuickDebates(now = Date.now()): Promise<Discussion[]> {
  let items: Discussion[];
  if (dataSource === 'api') {
    const [categories, page] = await Promise.all([getPublicCategories(), getPublicDebates({ status: 'OPEN', kind: 'QUICK' })]);
    items = page.data.debates.map((item) => toDiscussion(item, categories));
  } else {
    items = (await gateway.listDebates()).filter((item) => item.kind === '간단토론');
  }
  return items.filter((item) => item.status !== 'CLOSED' && !!item.endsAt && Date.parse(item.endsAt) > now)
    .sort((a, b) => Date.parse(a.endsAt!) - Date.parse(b.endsAt!));
}

export async function getDiscussions(): Promise<Discussion[]> {
  return gateway.listDebates();
}
