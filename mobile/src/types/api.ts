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
