import type { Discussion, HomeFeed } from '../../types/discussion';

// 실제 API 응답이 아닙니다. 기존 예시 3개를 유지하고 Figma 예시를 추가합니다.
export const mockDiscussions: Discussion[] = [
  { id: 'ai-class', category: '기술', kind: '끝장토론', status: 'OPEN',
    title: '대학 수업에서 생성형 AI를 허용해야 할까요?',
    description: '과제의 학습 효과와 공정성을 지키면서 AI를 활용할 수 있을까요? 허용 범위와 출처 표시 기준에 대해 이야기해요.',
    participants: 128, opinionCount: 36 },
  { id: 1, category: '기술', title: 'AI는 인간의 일자리를 대체할까?',
    description: 'AI 발전이 고용시장에 미치는 영향', participants: 128, status: 'OPEN' },
  { id: 2, category: '사회', title: '주 4일 근무제, 도입해야 할까?',
    description: '생산성과 삶의 질, 무엇이 중요할까?', participants: 86, status: 'OPEN' },
  { id: 3, category: '문화', title: '영화관보다 OTT가 더 좋을까?',
    description: '콘텐츠 감상 방식의 변화', participants: 54, status: 'OPEN' },
];

export function createMockHomeFeed(): HomeFeed {
  const popular = { ...mockDiscussions[0] };
  return { popular: [popular], recommended: [{ ...popular,
    description: '기술 분야에 관심이 있다면, AI와 학습의 공정성에 대한 토론에 참여해 보세요.' }] };
}
