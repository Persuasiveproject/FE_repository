import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Page } from '@/components/page';
import { ResourceContent } from '@/components/resource-content';
import { AppButton } from '@/components/ui/app-button';
import { Body, Caption, ErrorNotice, Notice, Panel, Row } from '@/components/ui/content-blocks';
import { isClosed, remainingTime, STANCE_LABEL } from '@/features/core/rules';
import { OpinionCard } from '@/features/opinions/opinion-card';
import { AiSummaryEntry, FeedFilterBar } from '@/features/opinions/public-opinion-feed';
import { OpinionReplies } from '@/features/opinions/opinion-replies';
import { TopicSummaryCard } from './topic-summary-card';
import { DetailAside } from './detail-aside';
import { useWide } from '@/hooks/use-wide';
import { useSession } from '@/features/session/session-provider';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { useMutation } from '@/hooks/use-mutation';
import { dataSource, gateway } from '@/services/gateway';
import ApiDetailScreen from './api-detail-screen';
import { IssueMapCard } from './issue-map';
import type { Opinion, Stance } from '@/types/core';

export default function DetailScreen() {
  if (dataSource === 'api') return <ApiDetailScreen />;
  return <DemoDetailScreen />;
}
function DemoDetailScreen() {
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
  const wide = useWide();
  const d = resource.status === 'success' ? resource.data.debate : null;
  const aside = d ? <DetailAside id={id} endsAt={d.endsAt} closed={isClosed(d, now)} participants={d.participants} category={d.category} kind={d.kind} /> : undefined;
  function thread(item: Opinion) { router.navigate({ pathname: '/discussions/[id]/threads/[opinionId]', params: { id, opinionId: item.id } }); }
  return <Page title="토론" aside={aside}>
    <ResourceContent resource={resource} reload={reload}>{({ debate, opinions }) => {
      const closed = isClosed(debate, now);
      const canParticipate = !!profile && !!debate.membership && !closed;
      const visible = opinions.filter((item) => filter === 'ALL' || item.stance === filter).sort((a, b) => sort === 'popular' ? b.upvotes - a.upvotes : b.createdAt.localeCompare(a.createdAt));
      return <>
        <TopicSummaryCard remaining={remainingTime(debate.endsAt, now)} title={debate.title} description={debate.description} closed={closed} category={debate.category} kind={debate.kind} />
        <Caption>손님 {debate.participants}명{debate.endsAt ? `   ${new Date(debate.endsAt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}에 문 닫아요` : ''}</Caption>
        {debate.membership && <Panel><Body>처음 선 자리  {STANCE_LABEL[debate.membership.initialStance]}</Body>
          <Body>지금 선 자리  {STANCE_LABEL[debate.membership.currentStance]}</Body></Panel>}
        {!profile && <AppButton label="로그인하고 참여하기" onPress={() => router.navigate('/auth/login')} />}
        {profile && !debate.membership && !closed && <AppButton label="입장 선택하고 참여하기" variant="primary" onPress={() => router.navigate({ pathname: '/discussions/[id]/join', params: { id } })} />}
        {canParticipate && <Row><AppButton label="한마디 남기기" variant="primary" onPress={() => router.navigate({ pathname: '/discussions/[id]/opinion', params: { id } })} />
          <AppButton label="투표 · 입장 변경" onPress={() => router.navigate({ pathname: '/discussions/[id]/vote', params: { id } })} /></Row>}
        {closed && <><Notice>종료된 토론이에요.</Notice>
          <AppButton label="최종 통계 보기" variant="primary" onPress={() => router.navigate({ pathname: '/discussions/[id]/results', params: { id } })} /></>}
        {!wide && <AiSummaryEntry debateId={id} />}
        {!wide && debate.kind === '끝장토론' && <IssueMapCard debateId={id} myStance={canParticipate ? debate.membership?.currentStance : null} />}
        <FeedFilterBar stance={filter} onStance={setFilter} sort={sort} onSort={setSort}
          sorts={[{ value: 'latest' as const, label: '최신순' }, { value: 'popular' as const, label: '공감순' }]} />
        <ErrorNotice message={mutation.error} />
        {visible.length === 0 && <Notice>아직 이 입장의 의견이 없습니다.</Notice>}
        {visible.map((item) => <View key={item.id} style={{ gap: 12 }}>
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
