export type ApiErrorBody = { error: { code: string; message: string; details?: unknown } };

// BE develop e72c8a4의 JoinedDebateSerializer 기준입니다. UI Discussion과 구분합니다.
export type JoinedDebateDto = {
  id: string;
  kind: string;
  title: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  categoryId: string;
  participantCount: number;
  opinionCount: number;
  viewCount: number;
  startedAt: string | null;
  endsAt: string | null;
  closedAt: string | null;
  canceledAt: string | null;
};
export type JoinedDebatesQuery = { status?: 'OPEN' | 'CLOSED'; cursor?: string };
export type JoinedDebatesResponse = { data: { debates: JoinedDebateDto[] }; meta: { nextCursor: string | null } };

// 공개 목록 #15도 같은 DebateListItem DTO를 사용합니다. 화면용 Discussion과는 다릅니다.
export type PublicDebateDto = JoinedDebateDto & { kind: 'QUICK' | 'ENDLESS' };
export type PublicDebatesQuery = { query?: string; categoryId?: string; status?: 'OPEN' | 'CLOSED'; cursor?: string };
export type PublicDebatesResponse = { data: { debates: PublicDebateDto[] }; meta: { nextCursor: string | null } };
export type CategoryDto = { id: string; name: string; sortOrder: number };
export type CategoriesResponse = { data: { categories: CategoryDto[] } };

export type PublicHomeDto = { popularDebates: PublicDebateDto[]; recommendedDebates: PublicDebateDto[] };
// 화면에서 사용하는 공개 상세 정보만 정의합니다. 이미지/인증 정보는 후속 연동 범위입니다.
export type PublicDetailDto = {
  id: string; kind: 'QUICK' | 'ENDLESS'; title: string; content: string; status: 'OPEN' | 'CLOSED';
  category: CategoryDto; createdAt: string; startedAt: string | null; endsAt: string | null;
  closedAt: string | null; canceledAt: string | null; participantCount: number;
  durationMinutes: number | null;
  myParticipation: import('./core').Membership | null;
};
export type PublicPostDto = {
  postId: string; debateId: string; parentId: string | null; rootId: string | null;
  stanceAtWrite: 'PRO' | 'CON' | 'NEUTRAL'; status: 'VISIBLE'; anonymousNo: number;
  content: string; createdAt: string; updatedAt: string;
  upvoteCount: number; downvoteCount: number; persuasionCount: number; replyCount: number;
};
export type PublicPostQuery = { stance?: 'PRO' | 'CON' | 'NEUTRAL'; sort?: 'latest' | 'upvotes' | 'persuasion'; cursor?: string };
export type PublicPostPage = { items: PublicPostDto[]; nextCursor: string | null };
