import { router, useLocalSearchParams } from 'expo-router';
import { Page } from '@/components/page';
import { AppButton } from '@/components/ui/app-button';
import { Notice } from '@/components/ui/content-blocks';
import { getRecentPublicPost, toOpinionCard } from '@/services/public-debate-api';
import { OpinionCard } from './opinion-card';
import { PublicOpinionFeed } from './public-opinion-feed';

export default function ApiThreadScreen() {
  const { id, opinionId } = useLocalSearchParams<{ id: string; opinionId: string }>();
  const parent = getRecentPublicPost(id, opinionId);
  return <Page title="의견과 반박">
    {parent ? <OpinionCard item={toOpinionCard(parent)} disabled canVote={false} onVote={() => {}} onReply={() => {}} onPersuaded={() => {}} />
      : <Notice>이 주소를 직접 열면 원문이 표시되지 않을 수 있어요. 원문은 토론방에서 확인해 주세요.</Notice>}
    <Notice>현재 의견과 답글 조회를 지원합니다. 글쓰기·투표·영업은 로그인 기능과 함께 준비 중입니다.</Notice>
    <PublicOpinionFeed key={`${id}/${opinionId}`} debateId={id} parentId={opinionId} />
    <AppButton label="토론 보기" onPress={() => router.navigate({ pathname: '/discussions/[id]', params: { id } })} />
  </Page>;
}
