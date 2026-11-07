import { Page } from '@/components/page';
import { RequireSession } from '@/components/require-session';
import { Body, Caption, Heading, Notice, Panel } from '@/components/ui/content-blocks';
import { useSession } from '@/features/session/session-provider';

export default function CreditsScreen() {
  const { profile } = useSession();
  return <Page title="크레딧과 배지"><RequireSession>
    <Panel><Heading>현재 크레딧 {profile?.credit.toFixed(1)}</Heading><Body>현재 배지 · {profile?.badge}</Body></Panel>
    <Notice>현재는 Figma 기준의 데모 값입니다. 실제 크레딧 계산·보상·배지 지급은 백엔드 연동 후 표시합니다.</Notice>
    <Caption>토론 참여와 의견의 가치를 확인하는 화면입니다. 아직 실제 점수나 보상을 적립하지 않습니다.</Caption>
  </RequireSession></Page>;
}
