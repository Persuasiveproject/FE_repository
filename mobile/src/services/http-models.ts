import { count, id, invalidResponse, record, string, timestamp } from './api-values.ts';
import type { Debate, DebateResults, Membership, Opinion, Profile, Stance } from '../types/core';
import type { PublicDetailDto, PublicPostDto } from '../types/api';

export function stance(value: unknown): Stance {
  if (value !== 'PRO' && value !== 'CON' && value !== 'NEUTRAL') invalidResponse();
  return value;
}
export function parseMembership(value: unknown): Membership {
  const data = record(value);
  const anonymousNo = count(data.anonymousNo);
  if (anonymousNo < 1) invalidResponse();
  return { participantId: id(data.participantId), anonymousNo, initialStance: stance(data.initialStance), currentStance: stance(data.currentStance), version: count(data.version) };
}
export function parseProfile(value: unknown, coins: number | null = null): Profile {
  const data = record(record(value).data);
  if (data.status !== 'ACTIVE') throw new Error('ACTIVE 시연 계정만 사용할 수 있습니다.');
  if (!Array.isArray(data.interests) || !Array.isArray(data.badges)) invalidResponse();
  const credit = string(data.credit);
  if (!/^-?\d+\.\d{6}$/.test(credit)) invalidResponse();
  const badges = data.badges.map((value) => record(value));
  for (const badge of badges) { string(badge.name); if (typeof badge.isRepresentative !== 'boolean') invalidResponse(); }
  return { id: id(data.id), nickname: string(data.nickname), interests: data.interests.map((value) => string(record(value).name)),
    coins, credit, badge: (badges.find((badge) => badge.isRepresentative === true)?.name as string | undefined) ?? '배지 없음' };
}
export function toDebate(data: PublicDetailDto): Debate {
  return { id: data.id, title: data.title, description: data.content, category: data.category.name,
    participants: data.participantCount, type: data.kind, kind: data.kind === 'QUICK' ? '간단토론' : '끝장토론',
    status: data.status, endsAt: data.endsAt, createdAt: data.createdAt, membership: data.myParticipation };
}
export function toOpinion(data: PublicPostDto, memberId?: string, membership?: Membership | null): Opinion {
  return { id: data.postId, debateId: data.debateId, parentId: data.parentId,
    ...(membership?.anonymousNo === data.anonymousNo && memberId ? { authorId: memberId } : {}),
    anonymousNo: data.anonymousNo, authorName: `익명 ${data.anonymousNo}`, stance: data.stanceAtWrite,
    content: data.content, createdAt: data.createdAt, upvotes: data.upvoteCount, downvotes: data.downvoteCount, replyCount: data.replyCount };
}
export function parseResults(value: unknown, debateId: string): DebateResults {
  const data = record(record(value).data); const counts = record(data.counts);
  const final = { PRO: count(counts.finalPro), CON: count(counts.finalCon), NEUTRAL: count(counts.finalNeutral) };
  const total = count(counts.totalParticipants);
  if (Object.values(final).reduce((sum, value) => sum + value, 0) !== total || !Array.isArray(data.sankeyData)) invalidResponse();
  const changed = counts.stanceChangedCount === null ? null : count(counts.stanceChangedCount);
  const kept = counts.stanceKeptCount === null ? null : count(counts.stanceKeptCount);
  if ((changed === null) !== (kept === null) || (changed !== null && kept !== null && changed + kept !== total)) invalidResponse();
  return { debateId, total, final, opinionCount: count(counts.opinionCount), replyCount: count(counts.rebuttalCount), changed, kept,
    transitions: data.sankeyData.map((value) => { const row = record(value); return { from: stance(row.from), to: stance(row.to), count: count(row.count) }; }),
    computedAt: timestamp(data.computedAt), demographics: null };
}
