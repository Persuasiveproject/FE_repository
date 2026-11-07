import type { Discussion } from '../../types/discussion';

export const discussionCategories = ['전체', '사회', '기술', '문화', '경제'] as const;

export function filterDiscussions(items: Discussion[], query: string, category: string, status: 'OPEN' | 'CLOSED') {
  const search = query.trim().toLocaleLowerCase();
  return items.filter((item) =>
    (category === '전체' || item.category === category) &&
    (item.status ?? 'OPEN') === status &&
    `${item.title} ${item.description} ${item.category}`.toLocaleLowerCase().includes(search));
}
