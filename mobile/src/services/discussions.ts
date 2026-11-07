import { createMockHomeFeed, mockDiscussions } from '@/features/discussions/mock-discussions';
import type { Discussion, HomeFeed } from '@/types/discussion';

// 공개 홈/목록 API는 BE develop에도 미연결입니다. 주소를 추측해 요청하지 않습니다.
// 실제 계약 확정 후 이 함수 내부만 API 요청 + DTO 변환으로 교체합니다.
export async function getHomeFeed(): Promise<HomeFeed> {
  return createMockHomeFeed();
}

export async function getDiscussions(): Promise<Discussion[]> {
  return mockDiscussions.map((item) => ({ ...item }));
}
