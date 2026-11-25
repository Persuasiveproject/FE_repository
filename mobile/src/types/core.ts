import type { Discussion } from './discussion';

// 화면에서 사용하는 모델입니다. 아직 미확정인 API DTO로 간주하지 않습니다.
export type Stance = 'PRO' | 'CON' | 'NEUTRAL';
export type DebateKind = 'QUICK' | 'ENDLESS';
export type Profile = { id: string; nickname: string; interests: string[]; coins: number | null; credit: number | string; badge: string };
export type Membership = { initialStance: Stance; currentStance: Stance; version: number; anonymousNo?: number; participantId?: string };
export type Debate = Discussion & {
  id: string;
  status: 'OPEN' | 'CLOSED';
  type: DebateKind;
  creatorId?: string;
  endsAt: string | null;
  createdAt: string;
  membership: Membership | null;
};
export type Opinion = {
  id: string;
  debateId: string;
  authorId?: string;
  anonymousNo?: number;
  authorName: string;
  stance: Stance;
  content: string;
  parentId: string | null;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  myVote?: 'UP' | 'DOWN' | null;
  replyCount: number;
};
export type CreateDebateInput = { category: string; kind: DebateKind; durationMinutes: number; title: string; content: string };
// 공개 API에는 실제 작성자 ID와 내 투표 상태가 없습니다. 카드 표시용 계약을 따로 둡니다.
export type OpinionCardData = Pick<Opinion, 'id' | 'authorName' | 'stance' | 'content' | 'createdAt' | 'upvotes' | 'downvotes' | 'replyCount'> & { myVote?: Opinion['myVote'] };
export type CreateOpinionInput = { debateId: string; parentId?: string; content: string };
export type ChangeStanceInput = { debateId: string; stance: Stance; opinionId?: string; version: number };
// 가입·로그인(AU-100·110): 카카오 또는 휴대폰 번호 중 하나로 가입한다.
export type AuthTerm = { id: string; type: 'SERVICE' | 'PRIVACY' | 'MARKETING' | string; version: string; isRequired: boolean; content: string };
export type PhoneCodeResult = { expiresInSeconds: number; resendAfterSeconds: number; devCode: string | null };
export type AuthResult = { status: 'LOGGED_IN'; profile: Profile } | { status: 'SIGNUP_REQUIRED'; signupToken: string; method: 'PHONE' | 'KAKAO' };
export type CompleteSignupInput = { signupToken: string; nickname: string; agreedTermIds: string[]; interests: string[] };
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
// items: 줄마다 근거 의견이 따로 붙은 요약(BE PR #58 이후). 없으면 text를 줄 단위로 나눠 보여 준다.
export type SummaryItem = { text: string; opinionIds: string[] };
// 토론 중 쟁점 정리. awaiting은 한쪽만 이야기한 쟁점에서 아직 답하지 않은 쪽이다.
export type IssueSide = { text: string; opinionIds: string[] };
export type Issue = { title: string; pro: IssueSide | null; con: IssueSide | null; awaiting: 'PRO' | 'CON' | null };
export type IssueMap = { createdAt: string | null; issues: Issue[] };
// 올리기 전 작성 코치. UNAVAILABLE이면 화면은 그대로 올린다.
export type CoachReason = 'ATTACK' | 'MOCKING' | 'GENERALIZING' | 'HOSTILE';
export type CoachResult = { verdict: 'OK' | 'SUGGEST' | 'UNAVAILABLE'; reasons: CoachReason[]; suggestion: string | null };
export type Summary = { generatedAt: string | null; sections: { title: string; text: string; opinionIds: string[]; generatedAt?: string; items?: SummaryItem[] }[] };
export type SavedDraft = { id: string; categoryId: string; input: CreateDebateInput; createdAt: string };
export type Wallet = { balance: number; transactions: { id: string; label: string; amount: number; createdAt: string }[] };
export type JoinedDebateCard = Discussion & { id: string; membership?: Membership | null };
export function creditLabel(value: Profile['credit'] | undefined): string { return typeof value === 'number' ? value.toFixed(1) : value ?? '확인 전'; }
