import { Page } from '@/components/page';
import { RequireSession } from '@/components/require-session';
import { Body, Caption, Heading, Notice, Panel } from '@/components/ui/content-blocks';
import { useSession } from '@/features/session/session-provider';
import { creditLabel } from '@/types/core';
import { dataSource } from '@/services/gateway';

export default function CreditsScreen() {
  const { profile } = useSession();
  return <Page title="크레딧과 배지"><RequireSession>
    <Panel><Heading>현재 크레딧 {creditLabel(profile?.credit)}</Heading><Body>현재 배지 · {profile?.badge}</Body></Panel>
    <Notice>{dataSource === 'api' ? '서버의 내 정보에서 조회한 크레딧과 배지입니다. 보상 지급 기능과는 별개입니다.' : '현재는 Figma 기준의 데모 값입니다.'}</Notice>
    <Caption>토론 참여와 의견의 가치를 확인하는 화면입니다.</Caption>
  </RequireSession></Page>;
}
