import { Page } from '@/components/page';
import { RequireSession } from '@/components/require-session';
import { Body, Caption, Heading, Notice, Panel } from '@/components/ui/content-blocks';
import { useSession } from '@/features/session/session-provider';
import { creditLabel } from '@/types/core';
import { dataSource } from '@/services/gateway';
import { badgeProgress } from './badge-progress';

export default function CreditsScreen() {
  const { profile } = useSession();
  const progress = badgeProgress(profile?.credit);
  return <Page title="크레딧과 배지"><RequireSession>
    <Panel><Heading>현재 크레딧 {creditLabel(profile?.credit)}</Heading><Body>현재 배지 · {profile?.badge}</Body></Panel>
    {progress && <Panel>{progress.nextBadge
      ? <Body>다음 배지 · {progress.nextBadge}까지 {progress.remaining}점 남았어요.</Body>
      : <Body>가장 높은 배지의 점수 기준에 도달했어요.</Body>}</Panel>}
    <Notice>{dataSource === 'api' ? '서버의 내 정보에서 조회한 크레딧과 배지입니다. 보상 지급 기능과는 별개입니다.' : '현재는 Figma 기준의 데모 값입니다.'}</Notice>
    <Caption>토론 참여와 의견의 가치를 확인하는 화면입니다.</Caption>
  </RequireSession></Page>;
}
