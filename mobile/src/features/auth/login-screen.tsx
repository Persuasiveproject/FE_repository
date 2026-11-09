import { router } from 'expo-router';
import { Page } from '@/components/page';
import { AppButton } from '@/components/ui/app-button';
import { Body, ErrorNotice, Heading, Notice, Panel } from '@/components/ui/content-blocks';
import { useSession } from '@/features/session/session-provider';
import { useMutation } from '@/hooks/use-mutation';
import { dataSource, gateway } from '@/services/gateway';

export default function LoginScreen() {
  const { refresh } = useSession();
  const mutation = useMutation();
  function demoLogin() {
    void mutation.run(async () => { await gateway.signInDemo(); await refresh(); }, () => {
      if (router.canGoBack()) router.back(); else router.replace('/my');
    });
  }
  return <Page title="로그인">
    <Heading>당신의 생각을 영업하세요.</Heading>
    <Body>다양한 생각이 만나고, 자유로운 토론이 시작되는 공간</Body>
    <Panel>
      <AppButton label="전화번호로 계속하기" disabled={dataSource !== 'mock'} onPress={() => router.navigate('/auth/phone')} />
      <AppButton label="카카오 로그인 · 연동 준비 중" disabled onPress={() => {}} />
    </Panel>
    <Notice>현재 실제 로그인과 본인 인증은 연결되지 않았습니다. 데모 시작은 서버 인증이 아닌 화면 체험용입니다.</Notice>
    <ErrorNotice message={mutation.error} />
    <AppButton label="데모 계정으로 시작" variant="primary" disabled={dataSource !== 'mock'} loading={mutation.pending} onPress={demoLogin} />
    <AppButton label="가입 폼 확인하기" disabled={dataSource !== 'mock'} onPress={() => router.navigate('/auth/signup')} />
    {dataSource === 'api' && <AppButton label="서버 토론 목록 보기" onPress={() => router.navigate('/discussions')} />}
    <AppButton label="로그인 없이 둘러보기" onPress={() => router.replace('/')} />
  </Page>;
}
