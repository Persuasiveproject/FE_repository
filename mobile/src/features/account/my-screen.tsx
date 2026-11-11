import { router } from 'expo-router';
import { useState } from 'react';
import { Page } from '@/components/page';
import { RequireSession } from '@/components/require-session';
import { AppButton } from '@/components/ui/app-button';
import { Body, Caption, ErrorNotice, Heading, Panel } from '@/components/ui/content-blocks';
import { useSession } from '@/features/session/session-provider';
import { useMutation } from '@/hooks/use-mutation';
import { dataSource, gateway } from '@/services/gateway';
import { creditLabel } from '@/types/core';

export default function MyScreen() {
  const { profile, refresh } = useSession();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const mutation = useMutation();
  return <Page title="마이페이지" back={false} tab><RequireSession>
    <Heading>{profile?.nickname}</Heading><Caption>{dataSource === 'api' ? '시연 계정 · 실제 서버 인증' : '데모 프로필 · 실제 본인 확인 전'}</Caption>
    <Panel><Body>크레딧 {creditLabel(profile?.credit)} · {profile?.badge}</Body>
      <AppButton label="크레딧과 배지 보기" onPress={() => router.navigate('/account/credits')} /></Panel>
    <Panel><Body>{profile?.coins == null ? '코인 잔액: 게시 응답에서 확인' : `${profile.coins} 코인`}</Body><AppButton label="코인 사용 내역" disabled={dataSource === 'api'} onPress={() => router.navigate('/account/coins')} /></Panel>
    <AppButton label="프로필과 관심 주제 수정" disabled={dataSource === 'api'} onPress={() => router.navigate('/account/profile')} />
    <AppButton label="참여한 토론 보기" onPress={() => router.navigate('/joined')} />
    {dataSource === 'api' && <>
      <AppButton label="알림" onPress={() => router.navigate('/account/notifications')} />
      <AppButton label="저장한 초안" onPress={() => router.navigate('/discussions/drafts')} />
    </>}
    <AppButton label={confirmLogout ? '취소' : '로그아웃'} onPress={() => setConfirmLogout(!confirmLogout)} />
    {confirmLogout && <AppButton label="로그아웃 확인" loading={mutation.pending} onPress={() => void mutation.run(async () => { await gateway.signOut(); await refresh(); }, () => router.replace('/'))} />}
    <ErrorNotice message={mutation.error} />
  </RequireSession></Page>;
}
