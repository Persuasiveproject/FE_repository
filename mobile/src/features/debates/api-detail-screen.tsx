import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Page } from '@/components/page';
import { ResourceContent } from '@/components/resource-content';
import { AppButton } from '@/components/ui/app-button';
import { Caption, Notice } from '@/components/ui/content-blocks';
import { remainingTime } from '@/features/core/rules';
import { PublicOpinionFeed } from '@/features/opinions/public-opinion-feed';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { getPublicDetail } from '@/services/public-debate-api';
import { TopicSummaryCard } from './topic-summary-card';

export default function ApiDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const loader = useCallback(() => getPublicDetail(id), [id]);
  const { resource, reload } = useFocusResource(loader);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  return <Page title="토론">
    <ResourceContent resource={resource} reload={reload}>{(debate) => <>
      <TopicSummaryCard remaining={debate.status === 'CLOSED' ? '토론 종료' : debate.endsAt === null ? '마감 시간 미정' : remainingTime(debate.endsAt, now)}
        title={debate.title} description={debate.content} />
      <Caption>{debate.category.name} · 참여 {debate.participantCount}명 · {debate.endsAt ? `마감 ${new Date(debate.endsAt).toLocaleString('ko-KR')}` : '마감 시간 미정'}</Caption>
      {debate.status === 'CLOSED' && <Notice>종료된 토론입니다. 의견과 입장은 더 이상 변경할 수 없습니다.</Notice>}
      <Notice>로그인 기능 준비 중입니다. 현재 토론과 의견을 읽을 수 있으며, 글쓰기·투표·영업은 아직 사용할 수 없습니다.</Notice>
      <AppButton label="로그인하고 참여하기" onPress={() => router.navigate('/auth/login')} />
      {debate.status === 'CLOSED' && <AppButton label="최종 통계 보기 · 연결 준비 중" disabled onPress={() => {}} />}
      <PublicOpinionFeed key={debate.id} debateId={debate.id} />
      <AppButton label="토론 목록으로" onPress={() => router.navigate('/discussions')} />
    </>}</ResourceContent>
  </Page>;
}
