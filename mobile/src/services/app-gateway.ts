import type { ChangeStanceInput, CreateDebateInput, CreateOpinionInput, Debate, DebateResults, JoinedDebateCard, Membership, Opinion, Profile, SavedDraft, SignUpInput, Stance, Summary, Wallet } from '../types/core';
import type { BasicCredentials } from './basic-auth';

// 화면용 계약입니다. mock/http 구현은 gateway.ts 한 곳에서 선택합니다.
export interface AppGateway {
  getSession(): Promise<Profile | null>;
  signInDemo(): Promise<Profile>;
  signInBasic?(credentials: BasicCredentials): Promise<Profile>;
  signUpDemo(input: SignUpInput): Promise<Profile>;
  signOut(): Promise<void>;
  updateProfile(input: Pick<Profile, 'nickname' | 'interests'>): Promise<Profile>;
  listDebates(): Promise<Debate[]>;
  getDebate(id: string): Promise<Debate>;
  listJoined(status: 'OPEN' | 'CLOSED'): Promise<JoinedDebateCard[]>;
  createDebate(input: CreateDebateInput, requestId: string): Promise<Debate>;
  saveDraft?(input: CreateDebateInput, requestId: string, draftId?: string): Promise<SavedDraft>;
  getDraft?(draftId: string): Promise<SavedDraft>;
  getSavedDrafts?(): SavedDraft[];
  publishDraft?(draftId: string, input: CreateDebateInput): Promise<Debate>;
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
