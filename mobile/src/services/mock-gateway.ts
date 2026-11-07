import type { AppGateway } from './app-gateway';
import { DomainError } from './app-gateway.ts';
import type { ChangeStanceInput, CreateDebateInput, CreateOpinionInput, Debate, DebateResults, Membership, Opinion, Profile, SignUpInput, Stance } from '../types/core';
import { mockDiscussions } from '../features/discussions/mock-discussions.ts';
import { isClosed, LIMITS, STANCES, validateDebate, validateOpinion, validateProfile } from '../features/core/rules.ts';

// 모델은 JSON 값만 포함하므로 Hermes에서도 사용할 수 있는 방식으로 복사합니다.
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

// 메모리 전용입니다. 재시작/웹 새로고침 시 초기화되며 실제 서버/인증/결제를 수행하지 않습니다.
export function createMockGateway(options: { enabled?: boolean; now?: () => number } = {}): AppGateway {
  const now = options.now ?? Date.now;
  const iso = () => new Date(now()).toISOString();
  let session: Profile | null = null;
  let profile: Profile = { id: 'demo-user', nickname: '생각하는 사람', interests: ['기술'], coins: 10, credit: 30, badge: '대화의 시작' };
  let sequence = 100;
  const debates: Debate[] = mockDiscussions.map((item) => ({ ...clone(item), id: String(item.id),
    status: 'OPEN', type: 'ENDLESS', creatorId: 'seed-author',
    createdAt: iso(), endsAt: new Date(now() + 72 * 3600000).toISOString(), membership: null }));
  debates.push({ ...clone(debates[0]), id: 'closed-demo', title: '종료된 토론 · 생성형 AI와 학습의 공정성', status: 'CLOSED',
    participants: 160, endsAt: new Date(now() - 3600000).toISOString() });
  const memberships = new Map<string, Membership>([['closed-demo', { initialStance: 'CON', currentStance: 'PRO', version: 1 }]]);
  // 기존 예시 참여자는 데모 집계에만 사용합니다. 진행 중에는 개별 입장을 공개하지 않습니다.
  const seedResults = new Map(debates.map((debate) => {
    const pro = Math.floor(debate.participants / 2);
    const con = Math.floor(debate.participants / 3);
    return [debate.id, { PRO: pro, CON: con, NEUTRAL: debate.participants - pro - con }] as const;
  }));
  const opinions: Opinion[] = [];
  for (const debate of debates) {
    const seed = [
      ['PRO', 'AI 사용 내역과 검토 과정을 공개하면 학습 효과를 지킬 수 있어요.'],
      ['CON', '기초 지식 없이 답을 받아들이면 학습이 어려워질 수 있어요.'],
      ['NEUTRAL', '과정 중심 평가와 사용 범위를 함께 정할 필요가 있어요.'],
    ] as const;
    seed.forEach(([stance, content], index) => opinions.push({ id: `${debate.id}-op-${index + 1}`, debateId: debate.id,
      authorId: `seed-${index}`, authorName: `익명 0${index + 12}`, stance, content, parentId: null,
      createdAt: iso(), upvotes: 21 - index * 3, downvotes: 0, myVote: null, replyCount: index === 0 ? 1 : 0 }));
    opinions.push({ id: `${debate.id}-reply-1`, debateId: debate.id, authorId: 'seed-3', authorName: '익명 031',
      stance: 'NEUTRAL', content: '평가 방법도 함께 바뀌어야 해요. 과정 중심 평가를 병행하면 어떨까요?',
      parentId: `${debate.id}-op-1`, createdAt: iso(), upvotes: 5, downvotes: 0, myVote: null, replyCount: 0 });
  }
  const creates = new Map<string, Debate>();
  const posts = new Map<string, Opinion>();
  const createdDays: string[] = [];
  function checkMode() { if (options.enabled === false) throw new DomainError('INTEGRATION_PENDING', 'API 연동 준비 중입니다. 현재 데모 모드에서 화면을 확인해 주세요.'); }
  function requireUser() { checkMode(); if (!session) throw new DomainError('AUTH_REQUIRED', '로그인이 필요한 기능입니다.'); return profile; }
  function findDebate(id: string) {
    checkMode(); const item = debates.find((debate) => debate.id === id);
    if (!item) throw new DomainError('NOT_FOUND', '토론을 찾을 수 없습니다.');
    return item;
  }
  function openDebate(id: string) { const item = findDebate(id); if (isClosed(item, now())) throw new DomainError('DEBATE_CLOSED', '종료된 토론에는 참여하거나 글을 작성할 수 없습니다.'); return item; }
  function requireMember(id: string) { requireUser(); openDebate(id); const member = memberships.get(id); if (!member) throw new DomainError('NOT_PARTICIPANT', '먼저 입장을 선택하고 참여해 주세요.'); return member; }
  function readDebate(item: Debate): Debate { return { ...clone(item), status: isClosed(item, now()) ? 'CLOSED' : 'OPEN', membership: session ? clone(memberships.get(item.id) ?? null) : null }; }
  function opinion(debateId: string, opinionId: string) {
    findDebate(debateId); const item = opinions.find((entry) => entry.id === opinionId && entry.debateId === debateId);
    if (!item) throw new DomainError('NOT_FOUND', '의견을 찾을 수 없습니다.'); return item;
  }
  function assertStance(stance: Stance) { if (!STANCES.includes(stance)) throw new DomainError('VALIDATION_ERROR', '입장을 선택해 주세요.'); }
  return {
    async getSession() { checkMode(); return session ? clone(profile) : null; },
    async signInDemo() { checkMode(); session = profile; return clone(profile); },
    async signUpDemo(input: SignUpInput) {
      checkMode(); const error = validateProfile(input); if (error) throw new DomainError('VALIDATION_ERROR', error);
      profile = { ...profile, nickname: input.nickname.trim(), interests: [...input.interests] }; session = profile; return clone(profile);
    },
    async signOut() { checkMode(); session = null; },
    async updateProfile(input) {
      requireUser(); const error = validateProfile({ ...input, termsAccepted: true, privacyAccepted: true });
      if (error) throw new DomainError('VALIDATION_ERROR', error);
      profile = { ...profile, nickname: input.nickname.trim(), interests: [...input.interests] }; session = profile; return clone(profile);
    },
    async listDebates() { checkMode(); return debates.map(readDebate); },
    async getDebate(id) { return readDebate(findDebate(id)); },
    async listJoined(status) { requireUser(); return debates.filter((item) => memberships.has(item.id) && readDebate(item).status === status).map(readDebate); },
    async createDebate(input: CreateDebateInput, requestId: string) {
      requireUser(); if (!requestId.trim()) throw new DomainError('VALIDATION_ERROR', '요청 식별자가 필요합니다.');
      const previous = creates.get(requestId); if (previous) return readDebate(previous);
      const error = validateDebate(input); if (error) throw new DomainError('VALIDATION_ERROR', error);
      if (profile.coins < LIMITS.cost) throw new DomainError('INSUFFICIENT_COINS', '코인이 부족합니다.');
      const today = iso().slice(0, 10);
      if (createdDays.filter((day) => day === today).length >= LIMITS.dailyCreates || debates.filter((item) => item.creatorId === profile.id && !isClosed(item, now())).length >= LIMITS.activeCreates) throw new DomainError('CREATE_LIMIT', '데모에서는 하루 3개, 동시에 3개까지 만들 수 있습니다.');
      const item: Debate = { id: `demo-${++sequence}`, category: input.category, title: input.title.trim(),
        description: input.content.trim(), participants: 0, opinionCount: 0, type: input.kind,
        kind: input.kind === 'QUICK' ? '간단토론' : '끝장토론', status: 'OPEN', creatorId: profile.id,
        createdAt: iso(), endsAt: new Date(now() + (input.kind === 'QUICK' ? input.durationMinutes * 60000 : 72 * 3600000)).toISOString(), membership: null };
      profile.coins -= LIMITS.cost; debates.unshift(item); creates.set(requestId, item); createdDays.push(today); return readDebate(item);
    },
    async joinDebate(id, stance) {
      requireUser(); const item = openDebate(id); assertStance(stance);
      const existing = memberships.get(id); if (existing) return clone(existing);
      const member = { initialStance: stance, currentStance: stance, version: 0 };
      memberships.set(id, member); item.participants++; return clone(member);
    },
    async listOpinions(debateId, parentId) {
      findDebate(debateId); if (parentId) opinion(debateId, parentId);
      return clone(opinions.filter((item) => item.debateId === debateId && item.parentId === (parentId ?? null)));
    },
    async getOpinion(debateId, opinionId) { return clone(opinion(debateId, opinionId)); },
    async postOpinion(input: CreateOpinionInput, requestId: string) {
      const member = requireMember(input.debateId);
      if (!requestId.trim()) throw new DomainError('VALIDATION_ERROR', '요청 식별자가 필요합니다.');
      const previous = posts.get(requestId); if (previous) return clone(previous);
      const error = validateOpinion(input.content); if (error) throw new DomainError('VALIDATION_ERROR', error);
      const parent = input.parentId ? opinion(input.debateId, input.parentId) : null;
      if (parent?.parentId) throw new DomainError('REPLY_DEPTH', '원래 의견에 답글을 작성해 주세요.');
      const item: Opinion = { id: `op-${++sequence}`, debateId: input.debateId, authorId: profile.id,
        authorName: '익명 나', stance: member.currentStance, content: input.content.trim(), parentId: input.parentId ?? null,
        createdAt: iso(), upvotes: 0, downvotes: 0, myVote: null, replyCount: 0 };
      opinions.unshift(item); if (parent) parent.replyCount++;
      const debate = findDebate(input.debateId); if (!parent) debate.opinionCount = (debate.opinionCount ?? 0) + 1;
      posts.set(requestId, item); return clone(item);
    },
    async voteOpinion(debateId, opinionId, vote) {
      requireMember(debateId); const item = opinion(debateId, opinionId);
      if (!['UP', 'DOWN'].includes(vote)) throw new DomainError('VALIDATION_ERROR', '올바른 투표를 선택해 주세요.');
      if (item.authorId === profile.id) throw new DomainError('SELF_VOTE', '내 글에는 투표할 수 없습니다.');
      const old = item.myVote;
      if (old === 'UP') item.upvotes--; if (old === 'DOWN') item.downvotes--;
      item.myVote = old === vote ? null : vote;
      if (item.myVote === 'UP') item.upvotes++; if (item.myVote === 'DOWN') item.downvotes++;
      return clone(item);
    },
    async changeStance(input: ChangeStanceInput) {
      const member = requireMember(input.debateId); assertStance(input.stance);
      if (input.version !== member.version) throw new DomainError('STANCE_CONFLICT', '다른 화면에서 입장이 바뀌었습니다. 새로고침 후 다시 선택해 주세요.');
      if (member.currentStance === input.stance) throw new DomainError('SAME_STANCE', '변경할 입장을 선택해 주세요.');
      if (input.opinionId) { const source = opinion(input.debateId, input.opinionId); if (source.authorId === profile.id) throw new DomainError('SELF_REFERENCE', '다른 사람의 의견을 근거로 선택해 주세요.'); }
      member.currentStance = input.stance; member.version++; return clone(member);
    },
    async getResults(id): Promise<DebateResults> {
      const item = findDebate(id); if (!isClosed(item, now())) throw new DomainError('RESULT_NOT_READY', '토론이 종료된 뒤 최종 통계를 볼 수 있습니다.');
      const sample = id === 'closed-demo'; const total = sample ? 160 : item.participants;
      const final = { ...(seedResults.get(id) ?? { PRO: 0, CON: 0, NEUTRAL: 0 }) };
      const member = memberships.get(id); if (member) final[member.currentStance]++;
      return { debateId: id, total, opinionCount: sample ? 64 : (item.opinionCount ?? 0), replyCount: sample ? 28 : opinions.filter((entry) => entry.debateId === id && entry.parentId).length,
        final: sample ? { PRO: 88, CON: 48, NEUTRAL: 24 } : final,
        changed: sample ? 56 : null, kept: sample ? 104 : null, computedAt: iso(), demographics: null,
        transitions: sample ? [
          { from: 'PRO', to: 'PRO', count: 64 }, { from: 'PRO', to: 'CON', count: 8 }, { from: 'PRO', to: 'NEUTRAL', count: 8 },
          { from: 'CON', to: 'PRO', count: 16 }, { from: 'CON', to: 'CON', count: 32 }, { from: 'CON', to: 'NEUTRAL', count: 8 },
          { from: 'NEUTRAL', to: 'PRO', count: 8 }, { from: 'NEUTRAL', to: 'CON', count: 8 }, { from: 'NEUTRAL', to: 'NEUTRAL', count: 8 },
        ] : [] };
    },
    async getSummary(id) {
      findDebate(id); const items = opinions.filter((item) => item.debateId === id && !item.parentId);
      return { generatedAt: iso(), sections: STANCES.map((stance) => ({ title: `${{ PRO: '찬성 핵심 근거', CON: '반대 핵심 근거', NEUTRAL: '유보와 남은 질문' }[stance]}`,
        text: items.find((item) => item.stance === stance)?.content ?? '아직 정리할 의견이 없습니다.', opinionIds: items.filter((item) => item.stance === stance).slice(0, 1).map((item) => item.id) })) };
    },
    async getWallet() {
      requireUser();
      return { balance: profile.coins, transactions: [
        { id: 'demo-grant', label: '화면 체험용 데모 코인', amount: 10, createdAt: debates.find((item) => item.id === 'ai-class')!.createdAt },
        ...[...creates.values()].map((item) => ({ id: item.id, label: `토론 게시 · ${item.title}`, amount: -LIMITS.cost, createdAt: item.createdAt })),
      ].reverse() };
    },
  };
}
