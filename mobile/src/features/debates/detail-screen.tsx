import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Page } from '@/components/page';
import { ResourceContent } from '@/components/resource-content';
import { AppButton } from '@/components/ui/app-button';
import { Body, Caption, ErrorNotice, Notice, Panel, Row } from '@/components/ui/content-blocks';
import { ChoiceGroup } from '@/features/core/choice-group';
import { isClosed, remainingTime, STANCES, STANCE_LABEL } from '@/features/core/rules';
import { OpinionCard } from '@/features/opinions/opinion-card';
import { OpinionReplies } from '@/features/opinions/opinion-replies';
import { TopicSummaryCard } from './topic-summary-card';
import { useSession } from '@/features/session/session-provider';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { useMutation } from '@/hooks/use-mutation';
import { gateway } from '@/services/gateway';
import type { Opinion, Stance } from '@/types/core';

export default function DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useSession();
  const loader = useCallback(async () => ({ debate: await gateway.getDebate(id), opinions: await gateway.listOpinions(id) }), [id]);
  const { resource, reload } = useFocusResource(loader);
  const [filter, setFilter] = useState<Stance | 'ALL'>('ALL');
  const [sort, setSort] = useState<'latest' | 'popular'>('latest');
  const [expandedOpinions, setExpandedOpinions] = useState<string[]>([]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const mutation = useMutation();
  function thread(item: Opinion) { router.navigate({ pathname: '/discussions/[id]/threads/[opinionId]', params: { id, opinionId: item.id } }); }
  return <Page title="토론">
    <ResourceContent resource={resource} reload={reload}>{({ debate, opinions }) => {
      const closed = isClosed(debate, now);
      const canParticipate = !!profile && !!debate.membership && !closed;
      const visible = opinions.filter((item) => filter === 'ALL' || item.stance === filter).sort((a, b) => sort === 'popular' ? b.upvotes - a.upvotes : b.createdAt.localeCompare(a.createdAt));
      return <>
        <TopicSummaryCard remaining={remainingTime(debate.endsAt, now)} title={debate.title} description={debate.description} />
        <Caption>{debate.category} · 참여 {debate.participants}명 · 마감 {new Date(debate.endsAt).toLocaleString('ko-KR')}</Caption>
        {debate.membership && <Panel><Body>최초 입장 · {STANCE_LABEL[debate.membership.initialStance]}</Body>
          <Body>내 입장 · {STANCE_LABEL[debate.membership.currentStance]}</Body></Panel>}
        {!profile && <AppButton label="로그인하고 참여하기" onPress={() => router.navigate('/auth/login')} />}
        {profile && !debate.membership && !closed && <AppButton label="입장 선택하고 참여하기" variant="primary" onPress={() => router.navigate({ pathname: '/discussions/[id]/join', params: { id } })} />}
        {canParticipate && <Row><AppButton label="의견 작성" variant="primary" onPress={() => router.navigate({ pathname: '/discussions/[id]/opinion', params: { id } })} />
          <AppButton label="투표 · 입장 변경" onPress={() => router.navigate({ pathname: '/discussions/[id]/vote', params: { id } })} /></Row>}
        {closed && <><Notice>종료된 토론입니다. 의견과 입장은 더 이상 변경할 수 없습니다.</Notice>
          <AppButton label="최종 통계 보기" variant="primary" onPress={() => router.navigate({ pathname: '/discussions/[id]/results', params: { id } })} /></>}
        <ChoiceGroup options={[{ value: 'ALL', label: '전체' }, ...STANCES.map((value) => ({ value, label: STANCE_LABEL[value] }))]} value={filter} onChange={setFilter} layout="row" />
        <Row><AppButton label="AI 요약" onPress={() => router.navigate({ pathname: '/discussions/[id]/summary', params: { id } })} />
          <AppButton label={sort === 'latest' ? '정렬 · 최신순' : '정렬 · 추천순'} onPress={() => setSort(sort === 'latest' ? 'popular' : 'latest')} /></Row>
        <ErrorNotice message={mutation.error} />
        {visible.length === 0 && <Notice>아직 이 입장의 의견이 없습니다.</Notice>}
        {visible.map((item) => <View key={item.id} style={{ gap: 8 }}>
          <OpinionCard item={item} disabled={mutation.pending || closed} canVote={canParticipate && item.authorId !== profile?.id}
            repliesExpanded={expandedOpinions.includes(item.id)}
            onOpen={() => setExpandedOpinions((current) => current.includes(item.id) ? current.filter((value) => value !== item.id) : [...current, item.id])}
            onVote={(vote) => void mutation.run(() => gateway.voteOpinion(id, item.id, vote), reload)}
            onPersuaded={() => router.navigate({ pathname: '/discussions/[id]/vote', params: { id, opinionId: item.id } })} />
          {expandedOpinions.includes(item.id) && <OpinionReplies debateId={id} parentId={item.id} closed={closed}
            canParticipate={canParticipate} onOpenThread={() => thread(item)} />}
        </View>)}
        <AppButton label="토론 목록으로" onPress={() => router.navigate('/discussions')} />
      </>;
    }}</ResourceContent>
  </Page>;
}
