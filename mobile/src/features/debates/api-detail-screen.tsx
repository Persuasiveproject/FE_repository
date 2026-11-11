import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Page } from '@/components/page';
import { ResourceContent } from '@/components/resource-content';
import { AppButton } from '@/components/ui/app-button';
import { Body, Caption, ErrorNotice, Notice, Panel, Row } from '@/components/ui/content-blocks';
import { useSession } from '@/features/session/session-provider';
import { STANCE_LABEL, remainingTime } from '@/features/core/rules';
import { withAuthRevision } from '@/services/basic-auth';
import { PublicOpinionFeed } from '@/features/opinions/public-opinion-feed';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { getPublicDetail } from '@/services/public-debate-api';
import { useServerClock } from '@/hooks/use-server-clock';
import type { PublicDetailDto } from '@/types/api';
import { TopicSummaryCard } from './topic-summary-card';

export default function ApiDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { revision } = useSession();
  const loader = useCallback(() => withAuthRevision(revision, () => getPublicDetail(id)), [id, revision]);
  const { resource, reload } = useFocusResource(loader);
  return <Page title="토론">
    <ResourceContent resource={resource} reload={reload}>{(debate) => <ApiDetailBody key={`${debate.id}/${revision}`} debate={debate} />}</ResourceContent>
  </Page>;
}
function ApiDetailBody({ debate }: { debate: PublicDetailDto }) {
  const { profile, revision } = useSession();
  const id = debate.id;
  const { clock, error, reload, writable } = useServerClock(id);
  const closed = debate.status === 'CLOSED' || clock?.isReadOnly === true;
  const canWrite = writable && !closed;
  return <>
      <TopicSummaryCard remaining={closed ? '토론 종료' : clock === null ? '서버 시간 확인 중' : clock.remainingSeconds === null ? '마감 시간 미정' : remainingTime(new Date(clock.serverNow + clock.remainingSeconds * 1000).toISOString(), clock.serverNow)}
        title={debate.title} description={debate.content} />
      <Caption>{debate.category.name} · 참여 {debate.participantCount}명 · {debate.endsAt ? `마감 ${new Date(debate.endsAt).toLocaleString('ko-KR')}` : '마감 시간 미정'}</Caption>
      <ErrorNotice message={error ? `서버 시간 확인 실패: ${error}` : ''} />
      {!!error && <AppButton label="서버 시간 다시 확인" onPress={reload} />}
      {closed && <Notice>종료된 토론입니다. 의견과 입장은 더 이상 변경할 수 없습니다.</Notice>}
      {!profile && <AppButton label="로그인하고 참여하기" onPress={() => router.navigate('/auth/login')} />}
      {profile && !closed && !debate.myParticipation && <AppButton label="입장 선택하고 참여하기" disabled={!canWrite} variant="primary" onPress={() => router.navigate({ pathname: '/discussions/[id]/join', params: { id } })} />}
      {debate.myParticipation && <Panel><Body>최초 입장 · {STANCE_LABEL[debate.myParticipation.initialStance]}</Body><Body>내 입장 · {STANCE_LABEL[debate.myParticipation.currentStance]}</Body>
        <AppButton label="내 입장 변경 이력" onPress={() => router.navigate({ pathname: '/discussions/[id]/events', params: { id } })} /></Panel>}
      {profile && debate.myParticipation && !closed && <Row>
        <AppButton label="의견 작성" disabled={!canWrite} variant="primary" onPress={() => router.navigate({ pathname: '/discussions/[id]/opinion', params: { id } })} />
        <AppButton label="투표 · 입장 변경" disabled={!canWrite} onPress={() => router.navigate({ pathname: '/discussions/[id]/vote', params: { id } })} />
      </Row>}
      {closed && <AppButton label="최종 통계 보기" variant="primary" onPress={() => router.navigate({ pathname: '/discussions/[id]/results', params: { id } })} />}
      <PublicOpinionFeed key={`${debate.id}/${revision}`} debateId={debate.id} membership={debate.myParticipation} closed={!canWrite} />
      <AppButton label="토론 목록으로" onPress={() => router.navigate('/discussions')} />
    </>;
}
