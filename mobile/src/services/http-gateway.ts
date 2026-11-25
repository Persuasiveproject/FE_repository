import { apiOrigin, apiRequest, ApiError } from './api-client.ts';
import { clearBasicAuth, commitBasicAuth, getAuthRevision, getBasicSession, isTokenSession, makeBasicHeader, newOperationKey, subscribeBasicAuth } from './basic-auth.ts';
import { DomainError, type AppGateway } from './app-gateway.ts';
import { count, id, invalidResponse, record, string, timestamp } from './api-values.ts';
import { parseMembership, parseProfile, parseResults, stance, toDebate, toOpinion } from './http-models.ts';
import { getPublicCategories, getPublicDebates, parsePublicDebates, toDiscussion } from './public-api.ts';
import { getPublicDetail, getPublicIssues, getPublicPosts, getPublicSummary, getPublicThread, getRecentPublicPost, parseCoach } from './public-debate-api.ts';
import { fetchDraft, patchDraft, type DraftDto } from './remaining-api.ts';
import type { AuthResult, AuthTerm, CreateDebateInput, Profile, SavedDraft } from '../types/core';
import { opinionReactions } from './opinion-reactions.ts';

const COIN_LABELS: Record<string, string> = {
  PURCHASE: '코인 구매', AD_REWARD: '광고 보상', DEBATE_CREATE: '토론 개설', REWARD: '토론 보상',
  SIGNUP_BONUS: '가입 축하 코인', ADMIN_GRANT: '운영자 지급', REFUND: '환불',
};
type DraftOperation = { draftId?: string; publishKey: string; signature: string; uncertain?: boolean; editUncertain?: boolean; draft?: SavedDraft; publishStarted?: boolean; published?: boolean };
// 객체 속성 순서에 의존하지 않고 서버로 보내는 값으로 같은 편집인지 판단합니다.
const draftSignature = (input: CreateDebateInput) => JSON.stringify([input.category, input.kind, input.kind === 'QUICK' ? input.durationMinutes : null, input.title.trim(), input.content.trim()]);
const copyDraft = (draft: SavedDraft): SavedDraft => ({ ...draft, input: { ...draft.input } });
export function createHttpGateway(): AppGateway {
  let profile: Profile | null = null;
  const keys = new Map<string, string>();
  const drafts = new Map<string, DraftOperation>();
  // 계정 변경/로그아웃/401이면 이전 계정의 상태와 재시도 기록도 버립니다.
  subscribeBasicAuth(() => { profile = null; keys.clear(); drafts.clear(); });
  // 로그인·가입 응답: 회원이면 토큰을 세션에 넣고, 처음이면 가입표를 돌려준다.
  function authResult(value: unknown): AuthResult {
    const data = record(record(value).data);
    if (data.status === 'SIGNUP_REQUIRED') {
      if (data.method !== 'PHONE' && data.method !== 'KAKAO') invalidResponse();
      return { status: 'SIGNUP_REQUIRED', signupToken: string(data.signupToken), method: data.method };
    }
    if (data.status !== 'LOGGED_IN' || typeof data.accessToken !== 'string' || !data.accessToken) invalidResponse();
    const next = parseProfile({ data: data.user });
    const revision = getAuthRevision();
    commitBasicAuth({ origin: apiOrigin(), memberId: next.id, authorization: `Bearer ${data.accessToken}` }, revision);
    profile = next;
    return { status: 'LOGGED_IN', profile: next };
  }
  const unavailable = async (): Promise<never> => { throw new DomainError('INTEGRATION_PENDING', '이 기능은 아직 서버 연결 준비 중입니다.'); };
  function key(scope: string) { if (!keys.has(scope)) keys.set(scope, newOperationKey('demo')); return keys.get(scope)!; }
  function ensureRevision(expected: number) { if (expected !== getAuthRevision()) throw new ApiError(0, 'SESSION_CHANGED', '계정이 변경되었습니다. 현재 계정으로 다시 시도해 주세요.'); }
  function requireRevision() {
    if (!getBasicSession()) throw new ApiError(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');
    return getAuthRevision();
  }
  async function draftBody(input: CreateDebateInput, revision: number) {
    const category = (await getPublicCategories()).find((item) => item.name === input.category);
    ensureRevision(revision);
    if (!category) throw new DomainError('CATEGORY_NOT_FOUND', '서버의 카테고리를 다시 선택해 주세요.');
    return { categoryId: category.id, kind: input.kind, title: input.title.trim(), content: input.content.trim(), durationMinutes: input.kind === 'QUICK' ? input.durationMinutes : null };
  }
  function assertCertain(operation: DraftOperation) {
    if (operation.uncertain) throw new DomainError('DRAFT_CREATE_UNCERTAIN', '초안 저장 결과를 확인할 수 없습니다. 반복 생성 전에 백엔드에서 초안을 확인해 주세요.');
  }
  async function createDraft(operation: DraftOperation, input: CreateDebateInput, revision: number) {
    const body = await draftBody(input, revision);
    try {
      const response = record(await apiRequest<unknown>('/v1/debates', { auth: 'required', method: 'POST', body }));
      ensureRevision(revision);
      const data = record(response.data);
      operation.draftId = id(data.debateId);
      if (data.status !== 'DRAFT') invalidResponse();
      operation.draft = { id: operation.draftId, categoryId: body.categoryId, input: { ...input, title: body.title, content: body.content }, createdAt: timestamp(data.createdAt) };
    } catch (error) {
      if (!(error instanceof ApiError) || error.status === 0 || error.status >= 500 || error.code === 'INVALID_RESPONSE') operation.uncertain = true;
      throw error;
    }
  }
  async function savedDraft(dto: DraftDto, revision: number): Promise<SavedDraft> {
    const category = (await getPublicCategories()).find((item) => item.id === dto.categoryId);
    ensureRevision(revision);
    if (!category) throw new DomainError('CATEGORY_NOT_FOUND', '초안의 카테고리를 찾지 못했습니다. 백엔드에서 카테고리 상태를 확인해 주세요.');
    return { id: dto.id, categoryId: dto.categoryId, createdAt: dto.createdAt, input: { category: category.name, kind: dto.kind, title: dto.title, content: dto.content, durationMinutes: dto.durationMinutes ?? 15 } };
  }
  function operationFor(draftId: string) { return [...drafts.values()].find((item) => item.draftId === draftId); }
  async function publish(operation: DraftOperation, revision: number) {
    ensureRevision(revision);
    operation.publishStarted = true;
    let response;
    try {
      response = record(await apiRequest<unknown>(`/v1/debates/${operation.draftId}/publish`, { auth: 'required', method: 'POST', idempotencyKey: operation.publishKey }));
    } catch (error) {
      // 응답 유실 시 같은 내용/키로만 재시도합니다. 확실한 거절일 때만 편집을 다시 허용합니다.
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) operation.publishStarted = false;
      throw error;
    }
    ensureRevision(revision);
    const data = record(response.data);
    if (id(data.debateId) !== operation.draftId || data.status !== 'OPEN') invalidResponse();
    operation.published = true;
    const balance = count(data.coinBalance); if (profile) profile = { ...profile, coins: balance };
    const debate = await gateway.getDebate(operation.draftId!); ensureRevision(revision); return debate;
  }
  const gateway: AppGateway = {
    async getSession() {
      if (!getBasicSession()) return null;
      const revision = getAuthRevision();
      const next = parseProfile(await apiRequest<unknown>('/v1/me', { auth: 'required' }), profile?.coins ?? null);
      ensureRevision(revision);
      profile = next; return next;
    },
    async signInBasic(credentials) {
      clearBasicAuth(); const revision = getAuthRevision();
      let response;
      try { response = await apiRequest<unknown>('/v1/me', { auth: 'login', credentials }); }
      catch (error) { if (error instanceof ApiError && error.status === 401) throw new ApiError(401, error.code, '회원 ID 또는 비밀번호를 확인해 주세요.'); throw error; }
      const next = parseProfile(response);
      if (next.id !== credentials.memberId) invalidResponse();
      commitBasicAuth({ origin: apiOrigin(), memberId: next.id, authorization: makeBasicHeader(credentials) }, revision);
      profile = next; return next;
    },
    signInDemo: unavailable, signUpDemo: unavailable,
    async updateProfile(input) {
      const revision = getAuthRevision();
      const nickname = input.nickname.trim();
      if (nickname !== profile?.nickname) {
        try { await apiRequest<unknown>('/v1/me', { auth: 'required', method: 'PATCH', body: { nickname } }); }
        catch (error) {
          if (error instanceof ApiError && error.code === 'NICKNAME_INVALID' && !/[가-힣]/.test(error.message)) throw new ApiError(error.status, error.code, '사용할 수 없는 닉네임이에요.');
          throw error;
        }
      }
      const categories = await getPublicCategories();
      const ids = categories.filter((item) => input.interests.includes(item.name)).map((item) => item.id);
      await apiRequest<unknown>('/v1/me/interests', { auth: 'required', method: 'PUT', body: { categoryIds: ids } });
      ensureRevision(revision);
      return await gateway.getSession() ?? invalidResponse();
    },
    async signOut() {
      // 토큰 로그인은 서버에서도 무효로 한다. 실패해도(만료·오프라인) 이 기기에서는 로그아웃한다.
      if (isTokenSession()) { try { await apiRequest<unknown>('/v1/auth/logout', { auth: 'required', method: 'POST' }); } catch { /* 무시 */ } }
      clearBasicAuth(); profile = null;
    },
    async requestPhoneCode(phoneNumber) {
      const data = record(record(await apiRequest<unknown>('/v1/auth/phone/code', { auth: 'public', method: 'POST', body: { phoneNumber } })).data);
      return { expiresInSeconds: count(data.expiresInSeconds), resendAfterSeconds: count(data.resendAfterSeconds),
        devCode: typeof data.devCode === 'string' ? data.devCode : null };
    },
    async verifyPhoneCode(phoneNumber, code) {
      return authResult(await apiRequest<unknown>('/v1/auth/phone/verify', { auth: 'public', method: 'POST', body: { phoneNumber, code } }));
    },
    async signInKakao(code, redirectUri) {
      return authResult(await apiRequest<unknown>('/v1/auth/kakao', { auth: 'public', method: 'POST', body: { code, redirectUri } }));
    },
    async getTerms() {
      const data = record(record(await apiRequest<unknown>('/v1/terms', { auth: 'public' })).data);
      if (!Array.isArray(data.terms)) invalidResponse();
      return data.terms.map((value): AuthTerm => {
        const term = record(value);
        if (typeof term.isRequired !== 'boolean') invalidResponse();
        return { id: id(term.id), type: string(term.type), version: string(term.version), isRequired: term.isRequired, content: string(term.content) };
      });
    },
    async completeSignup(input) {
      const result = authResult(await apiRequest<unknown>('/v1/auth/signup', { auth: 'public', method: 'POST',
        body: { signupToken: input.signupToken, nickname: input.nickname.trim(), agreedTermIds: input.agreedTermIds } }));
      if (result.status !== 'LOGGED_IN') invalidResponse();
      if (input.interests.length) {
        // 관심 주제는 가입 직후 따로 저장한다. 실패해도 가입은 끝났으니 마이 페이지에서 다시 고를 수 있다.
        try {
          const categories = await getPublicCategories();
          const ids = categories.filter((item) => input.interests.includes(item.name)).map((item) => item.id);
          await apiRequest<unknown>('/v1/me/interests', { auth: 'required', method: 'PUT', body: { categoryIds: ids } });
          return await gateway.getSession() ?? result.profile;
        } catch { return result.profile; }
      }
      return result.profile;
    },
    async listDebates() {
      const [page, categories] = await Promise.all([getPublicDebates(), getPublicCategories()]);
      return page.data.debates.map((item) => ({ ...toDiscussion(item, categories), id: item.id, status: item.status, type: item.kind, createdAt: item.createdAt, endsAt: item.endsAt, membership: null }));
    },
    async getDebate(debateId) { return toDebate(await getPublicDetail(debateId)); },
    async listJoined(status) {
      const revision = getAuthRevision();
      const [value, categories] = await Promise.all([apiRequest<unknown>(`/v1/me/debates?status=${status}`, { auth: 'required' }), getPublicCategories()]);
      ensureRevision(revision);
      return parsePublicDebates(value).data.debates.map((item) => ({ ...toDiscussion(item, categories), id: item.id }));
    },
    async createDebate(input: CreateDebateInput, requestId) {
      const revision = requireRevision();
      const operationId = requestId;
      const signature = draftSignature(input);
      let operation = drafts.get(operationId);
      if (!operation) { operation = { publishKey: newOperationKey('publish'), signature }; drafts.set(operationId, operation); }
      assertCertain(operation);
      if (operation.draftId && operation.signature !== signature) throw new DomainError('REQUEST_PAYLOAD_CHANGED', '이전 게시 요청의 결과를 먼저 확인해 주세요. 같은 게시 작업의 내용을 바꿔 중복 생성하지 않습니다.');
      operation.signature = signature;
      if (!operation.draftId) await createDraft(operation, input, revision);
      return publish(operation, revision);
    },
    async saveDraft(input, requestId, draftId) {
      const revision = requireRevision();
      let operation = draftId ? operationFor(id(draftId)) : drafts.get(requestId);
      if (!operation && draftId) { await gateway.getDraft!(draftId); ensureRevision(revision); operation = operationFor(draftId); }
      if (!operation) { operation = { publishKey: newOperationKey('publish'), signature: draftSignature(input) }; drafts.set(requestId, operation); }
      assertCertain(operation);
      if (operation.publishStarted || operation.published) throw new DomainError('PUBLISH_IN_PROGRESS', '게시 결과를 먼저 확인해 주세요. 응답이 유실되었다면 같은 내용으로 게시를 다시 시도해 주세요.');
      if (!operation.draftId) await createDraft(operation, input, revision);
      else {
        const body = await draftBody(input, revision);
        // PATCH 응답이 끊겨도 서버 내용은 바뀌었을 수 있습니다. 게시 전에 다시 저장해야 합니다.
        operation.editUncertain = true;
        const dto = await patchDraft(operation.draftId, body); ensureRevision(revision);
        operation.draft = { id: dto.id, categoryId: dto.categoryId, createdAt: dto.createdAt, input: { ...input, title: dto.title, content: dto.content } };
        operation.editUncertain = false;
      }
      ensureRevision(revision); operation.signature = draftSignature(input);
      return copyDraft(operation.draft!);
    },
    async getDraft(draftId) {
      const revision = requireRevision();
      const dto = await fetchDraft(draftId); ensureRevision(revision);
      const draft = await savedDraft(dto, revision);
      let operation = operationFor(draft.id);
      if (!operation) { operation = { draftId: draft.id, publishKey: newOperationKey('publish'), signature: draftSignature(draft.input) }; drafts.set(`resume:${draft.id}`, operation); }
      // 게시 결과가 불명확한 작업의 원래 내용/키는 덮어쓰지 않습니다.
      if (!operation.publishStarted) { operation.draft = draft; operation.signature = draftSignature(draft.input); operation.editUncertain = false; }
      return copyDraft(draft);
    },
    getSavedDrafts() {
      requireRevision();
      return [...new Map([...drafts.values()].filter((item) => item.draft && !item.published).map((item) => [item.draft!.id, copyDraft(item.draft!)])).values()];
    },
    async publishDraft(draftId, input) {
      const revision = requireRevision();
      let operation = operationFor(id(draftId));
      if (!operation) { await gateway.getDraft!(draftId); ensureRevision(revision); operation = operationFor(draftId); }
      if (!operation) invalidResponse();
      assertCertain(operation);
      if (operation.editUncertain || operation.signature !== draftSignature(input)) {
        await gateway.saveDraft!(input, `resume:${draftId}`, draftId); ensureRevision(revision);
      }
      return publish(operation, revision);
    },
    async joinDebate(debateId, stance) {
      try {
        const response = record(await apiRequest<unknown>(`/v1/debates/${id(debateId)}/participants`, { auth: 'required', method: 'POST', body: { stance }, idempotencyKey: key(JSON.stringify(['join', debateId, stance])) }));
        return parseMembership(response.data);
      } catch (error) {
        if (error instanceof ApiError && error.code === 'ALREADY_PARTICIPATING') {
          const member = (await gateway.getDebate(debateId)).membership;
          if (member) return member;
        }
        throw error;
      }
    },
    async listOpinions(debateId, parentId) {
      const revision = getAuthRevision();
      const [debate, page] = await Promise.all([gateway.getDebate(debateId), parentId ? getPublicThread(debateId, parentId) : getPublicPosts(debateId)]);
      ensureRevision(revision);
      return page.items.map((item) => toOpinion(item, getBasicSession()?.memberId, debate.membership));
    },
    async getOpinion(debateId, opinionId) {
      const revision = getAuthRevision();
      let item = getRecentPublicPost(debateId, opinionId);
      if (!item) { await getPublicPosts(debateId); item = getRecentPublicPost(debateId, opinionId); }
      if (!item) throw new DomainError('POST_NOT_LOADED', '토론방에서 원래 의견을 연 뒤 다시 시도해 주세요.');
      const debate = await gateway.getDebate(debateId);
      ensureRevision(revision);
      return toOpinion(item, getBasicSession()?.memberId, debate.membership);
    },
    async postOpinion(input, requestId) {
      const response = record(await apiRequest<unknown>(`/v1/debates/${id(input.debateId)}/posts`, { auth: 'required', method: 'POST', idempotencyKey: key(JSON.stringify(['post', requestId])),
        body: { content: input.content.trim(), ...(input.parentId ? { parentId: id(input.parentId) } : {}), references: [] } }));
      const data = record(response.data);
      if (data.status !== 'VISIBLE') invalidResponse();
      // 생성 응답에는 본문/작성자/표수가 없습니다. 생성 ID로만 이동하고 목록에서 다시 조회합니다.
      return { id: id(data.postId), debateId: input.debateId, parentId: input.parentId ?? null, authorName: '익명 나',
        content: input.content.trim(), createdAt: timestamp(data.createdAt), stance: stance(data.stanceAtWrite), upvotes: 0, downvotes: 0, replyCount: 0 };
    },
    async voteOpinion(debateId, opinionId, vote) {
      const revision = requireRevision();
      const debate = await gateway.getDebate(debateId); ensureRevision(revision);
      let post = getRecentPublicPost(debateId, opinionId);
      if (!post) { await gateway.getOpinion(debateId, opinionId); ensureRevision(revision); post = getRecentPublicPost(debateId, opinionId); }
      if (!post) throw new DomainError('POST_NOT_LOADED', '토론방에서 의견을 불러온 뒤 다시 시도해 주세요.');
      const target = { debateId, postId: opinionId, parentId: post.parentId };
      const access = { signedIn: !!getBasicSession(), participant: !!debate.membership,
        own: !!debate.membership && debate.membership.anonymousNo === post.anonymousNo, closed: debate.status === 'CLOSED' };
      const ok = opinionReactions.get(target).retry ? await opinionReactions.retry(target, access) : await opinionReactions.press(target, vote, access);
      ensureRevision(revision);
      const snapshot = opinionReactions.get(target);
      if (!ok || !snapshot.counts || snapshot.reaction === 'UNKNOWN') throw new DomainError('REACTION_NOT_CONFIRMED', snapshot.error || '반응을 처리 중입니다. 결과를 확인한 뒤 다시 시도해 주세요.');
      return { ...toOpinion(post, getBasicSession()?.memberId, debate.membership), upvotes: snapshot.counts.upvoteCount, downvotes: snapshot.counts.downvoteCount, myVote: snapshot.reaction };
    },
    async changeStance(input) {
      const revision = getAuthRevision();
      await apiRequest<unknown>(`/v1/debates/${id(input.debateId)}/me/stance`, { auth: 'required', method: 'PATCH',
        idempotencyKey: key(JSON.stringify(['stance', input])), body: { stance: input.stance, version: input.version, ...(input.opinionId ? { opinionId: id(input.opinionId) } : {}) } });
      // PATCH 성공 응답에는 version이 없습니다. 상세의 myParticipation으로 다시 읽습니다.
      ensureRevision(revision);
      const membership = (await gateway.getDebate(input.debateId)).membership; ensureRevision(revision);
      if (!membership) invalidResponse(); return membership;
    },
    async getResults(debateId) {
      try { return parseResults(await apiRequest<unknown>(`/v1/debates/${id(debateId)}/result`, { auth: 'optional' }), debateId); }
      catch (error) {
        if (error instanceof ApiError && error.code === 'RESULT_NOT_READY') {
          const status = (error.details as { status?: string } | undefined)?.status;
          throw new ApiError(error.status, error.code, status === 'FAILED' ? '집계에 실패했습니다. 잠시 후 다시 시도해 주세요.' : '토론 종료 또는 결과 집계를 기다리고 있습니다. 잠시 후 다시 불러와 주세요.', error.details);
        }
        throw error;
      }
    },
    getSummary: getPublicSummary, getIssues: getPublicIssues,
    async getWallet() {
      const revision = getAuthRevision();
      const [wallet, history] = await Promise.all([
        apiRequest<unknown>('/v1/me/wallet', { auth: 'required' }),
        apiRequest<unknown>('/v1/me/coin-transactions', { auth: 'required' }),
      ]);
      ensureRevision(revision);
      const balance = count(record(record(wallet).data).coinBalance);
      if (profile) profile = { ...profile, coins: balance };
      const entries = record(record(history).data).transactions;
      if (!Array.isArray(entries)) invalidResponse();
      return { balance, transactions: entries.map((value) => {
        const entry = record(value);
        if (typeof entry.amount !== 'number' || !Number.isSafeInteger(entry.amount)) invalidResponse();
        return { id: id(entry.id), label: COIN_LABELS[string(entry.type)] ?? '코인 변동', amount: entry.amount, createdAt: timestamp(entry.createdAt) };
      }) };
    },
    async coachOpinion(input) {
      // 코치는 글쓰기를 막지 않는다. 느리거나 실패하면 UNAVAILABLE로 보고 그대로 올린다.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        return parseCoach(await apiRequest<unknown>(`/v1/debates/${id(input.debateId)}/posts/coach`, { auth: 'required', method: 'POST', signal: controller.signal,
          body: { content: input.content.trim(), ...(input.parentId ? { parentId: id(input.parentId) } : {}) } }));
      } catch { return { verdict: 'UNAVAILABLE', reasons: [], suggestion: null }; }
      finally { clearTimeout(timer); }
    },
  };
  return gateway;
}
