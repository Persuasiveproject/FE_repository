import type { ChangeStanceInput, CreateDebateInput, CreateOpinionInput, Debate, DebateResults, Membership, Opinion, Profile, SignUpInput, Stance, Summary, Wallet } from '../types/core';

// UI가 사용하는 계약. BE의 URL/DTO 확정 후 같은 인터페이스의 HTTP 구현으로 교체합니다.
export interface AppGateway {
  getSession(): Promise<Profile | null>;
  signInDemo(): Promise<Profile>;
  signUpDemo(input: SignUpInput): Promise<Profile>;
  signOut(): Promise<void>;
  updateProfile(input: Pick<Profile, 'nickname' | 'interests'>): Promise<Profile>;
  listDebates(): Promise<Debate[]>;
  getDebate(id: string): Promise<Debate>;
  listJoined(status: 'OPEN' | 'CLOSED'): Promise<Debate[]>;
  createDebate(input: CreateDebateInput, requestId: string): Promise<Debate>;
  joinDebate(id: string, stance: Stance): Promise<Membership>;
  listOpinions(debateId: string, parentId?: string): Promise<Opinion[]>;
  getOpinion(debateId: string, opinionId: string): Promise<Opinion>;
  postOpinion(input: CreateOpinionInput, requestId: string): Promise<Opinion>;
  voteOpinion(debateId: string, opinionId: string, vote: 'UP' | 'DOWN'): Promise<Opinion>;
  changeStance(input: ChangeStanceInput): Promise<Membership>;
  getResults(id: string): Promise<DebateResults>;
  getSummary(id: string): Promise<Summary>;
  getWallet(): Promise<Wallet>;
}
export class DomainError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.name = 'DomainError'; this.code = code; }
}
