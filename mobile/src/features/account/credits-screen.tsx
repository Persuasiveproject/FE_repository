import { Page } from '@/components/page';
import { RequireSession } from '@/components/require-session';
import { Body, Heading, Panel } from '@/components/ui/content-blocks';
import { useSession } from '@/features/session/session-provider';
import { creditLabel } from '@/types/core';

export default function CreditsScreen() {
  const { profile } = useSession();
  return <Page title="크레딧과 배지"><RequireSession>
    <Panel><Heading>현재 크레딧 {creditLabel(profile?.credit)}</Heading><Body>현재 배지 · {profile?.badge}</Body></Panel>
  </RequireSession></Page>;
}
