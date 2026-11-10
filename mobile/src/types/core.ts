import type { Discussion } from './discussion';

// 화면에서 사용하는 모델입니다. 아직 미확정인 API DTO로 간주하지 않습니다.
export type Stance = 'PRO' | 'CON' | 'NEUTRAL';
export type DebateKind = 'QUICK' | 'ENDLESS';
export type Profile = { id: string; nickname: string; interests: string[]; coins: number; credit: number; badge: string };
export type Membership = { initialStance: Stance; currentStance: Stance; version: number };
export type Debate = Discussion & {
  id: string;
  status: 'OPEN' | 'CLOSED';
  type: DebateKind;
  creatorId: string;
  endsAt: string;
  createdAt: string;
  membership: Membership | null;
};
export type Opinion = {
  id: string;
  debateId: string;
  authorId: string;
  authorName: string;
  stance: Stance;
  content: string;
  parentId: string | null;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  myVote: 'UP' | 'DOWN' | null;
  replyCount: number;
};
export type CreateDebateInput = { category: string; kind: DebateKind; durationMinutes: number; title: string; content: string };
// 공개 API에는 실제 작성자 ID와 내 투표 상태가 없습니다. 카드 표시용 계약을 따로 둡니다.
export type OpinionCardData = Pick<Opinion, 'id' | 'authorName' | 'stance' | 'content' | 'createdAt' | 'upvotes' | 'downvotes' | 'replyCount'> & { myVote?: Opinion['myVote'] };
export type CreateOpinionInput = { debateId: string; parentId?: string; content: string };
export type ChangeStanceInput = { debateId: string; stance: Stance; opinionId?: string; version: number };
export type SignUpInput = { nickname: string; interests: string[]; termsAccepted: boolean; privacyAccepted: boolean };
export type Transition = { from: Stance; to: Stance; count: number };
export type DebateResults = {
  debateId: string;
  total: number;
  opinionCount: number;
  replyCount: number;
  final: Record<Stance, number>;
  changed: number | null;
  kept: number | null;
  transitions: Transition[];
  computedAt: string;
  demographics: null;
};
export type Summary = { generatedAt: string | null; sections: { title: string; text: string; opinionIds: string[] }[] };
export type Wallet = { balance: number; transactions: { id: string; label: string; amount: number; createdAt: string }[] };
