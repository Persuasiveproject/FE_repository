import type { CreateDebateInput, SignUpInput, Stance } from '../../types/core';

export const STANCES: Stance[] = ['PRO', 'CON', 'NEUTRAL'];
export const STANCE_LABEL: Record<Stance, string> = { PRO: '찬성', CON: '반대', NEUTRAL: '유보' };
export const CREATE_CATEGORIES = ['개인적 고민', '연애', '기술', '운동', '여행', '취미', '엔터테인먼트', '학문·교육', '건강', '경제'] as const;
export const LIMITS = { title: 100, content: 5000, opinion: 1000, nickname: 20, cost: 1, dailyCreates: 3, activeCreates: 3 } as const;

export function validateDebate(input: CreateDebateInput, categories: readonly string[] = CREATE_CATEGORIES): string | null {
  if (!categories.includes(input.category)) return '주제를 선택해 주세요.';
  if (!['QUICK', 'ENDLESS'].includes(input.kind)) return '토론 방식을 선택해 주세요.';
  if (input.kind === 'QUICK' && (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 5 || input.durationMinutes > 15)) return '간단토론은 5~15분으로 설정해 주세요.';
  if (!input.title.trim() || input.title.trim().length > LIMITS.title) return '제목은 1~100자로 입력해 주세요.';
  if (!input.content.trim() || input.content.trim().length > LIMITS.content) return '내용은 1~5,000자로 입력해 주세요.';
  return null;
}
export function validateOpinion(content: string): string | null {
  return !content.trim() || content.trim().length > LIMITS.opinion ? '본문은 1~1,000자로 입력해 주세요.' : null;
}
export function validateProfile(input: SignUpInput): string | null {
  if (input.nickname.trim().length < 2 || input.nickname.trim().length > LIMITS.nickname) return '닉네임은 2~20자로 입력해 주세요.';
  if (!input.termsAccepted || !input.privacyAccepted) return '필수 항목을 확인해 주세요.';
  if (input.interests.length > 5 || input.interests.some((item) => !CREATE_CATEGORIES.some((category) => category === item))) return '관심 주제는 목록에서 최대 5개까지 선택해 주세요.';
  return null;
}
export function isClosed(debate: { status: string; endsAt: string | null }, now = Date.now()) {
  return debate.status === 'CLOSED' || (debate.endsAt !== null && Date.parse(debate.endsAt) <= now);
}
export function remainingTime(endsAt: string | null, now = Date.now()) {
  if (endsAt === null) return '마감 시간 미정';
  const minutes = Math.ceil((Date.parse(endsAt) - now) / 60000);
  if (minutes <= 0) return '토론 종료';
  if (minutes < 60) return `마감까지 ${minutes}분`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `마감까지 ${hours}시간 ${minutes % 60}분` : `마감까지 ${Math.floor(hours / 24)}일 ${hours % 24}시간`;
}
