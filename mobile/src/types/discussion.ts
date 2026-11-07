// 화면용 타입입니다. BE 응답 타입과 분리하고 연동 시 service에서 변환합니다.
export type Discussion = {
  id: string | number;
  category: string;
  title: string;
  description: string;
  participants: number;
  opinionCount?: number;
  kind?: '끝장토론' | '간단토론';
  status?: 'OPEN' | 'CLOSED';
};

export type HomeFeed = {
  popular: Discussion[];
  recommended: Discussion[];
};
