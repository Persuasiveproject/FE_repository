import { createMockHomeFeed, mockDiscussions } from '@/features/discussions/mock-discussions';
import type { Discussion, HomeFeed } from '@/types/discussion';
import { dataSource, gateway } from './gateway';
import { getPublicHomeFeed } from './public-debate-api';

export async function getHomeFeed(): Promise<HomeFeed> {
  if (dataSource === 'api') return getPublicHomeFeed();
  const feed = createMockHomeFeed();
  const popular = await gateway.getDebate(String(mockDiscussions[0].id));
  return { popular: [popular], recommended: [{ ...popular, description: feed.recommended[0].description }] };
}

export async function getDiscussions(): Promise<Discussion[]> {
  return gateway.listDebates();
}
