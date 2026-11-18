// BE PR #49의 계약입니다. 목록 응답에 내 반응 필드는 아직 없습니다.
export type OpinionReaction = 'UP' | 'DOWN';
export type ReactionCounts = { upvoteCount: number; downvoteCount: number };
export type OpinionReactionResult = ReactionCounts & { reaction: OpinionReaction };
export type ReactionTarget = { debateId: string; postId: string; parentId: string | null };
export type ReactionAccess = { signedIn: boolean; participant: boolean; own: boolean; closed: boolean };
