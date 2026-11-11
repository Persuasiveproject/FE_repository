import { router } from 'expo-router';
import { useState } from 'react';
import { Page } from '@/components/page';
import { AppButton } from '@/components/ui/app-button';
import { Body, ErrorNotice, Heading, Notice, Panel } from '@/components/ui/content-blocks';
import { useSession } from '@/features/session/session-provider';
import { useMutation } from '@/hooks/use-mutation';
import { dataSource, gateway } from '@/services/gateway';
import { FormField } from '@/components/ui/form-field';

export default function LoginScreen() {
  const { refresh } = useSession();
  const mutation = useMutation();
  const [memberId, setMemberId] = useState('');
  const [password, setPassword] = useState('');
  function basicLogin() {
    void mutation.run(async () => {
      try {
        if (!gateway.signInBasic) throw new Error('시연 인증을 사용할 수 없습니다.');
        await gateway.signInBasic({ memberId: memberId.trim(), password }); await refresh();
      } finally { setPassword(''); }
    }, () => { if (router.canGoBack()) router.back(); else router.replace('/my'); });
  }
  function demoLogin() {
    void mutation.run(async () => { await gateway.signInDemo(); await refresh(); }, () => {
      if (router.canGoBack()) router.back(); else router.replace('/my');
    });
  }
  return <Page title="로그인">
    <Heading>당신의 생각을 영업하세요.</Heading>
    <Body>다양한 생각이 만나고, 자유로운 토론이 시작되는 공간</Body>
    {dataSource === 'api' && <Panel>
      <Notice>시연 전용 계정 로그인입니다. 실제 서버에 연결하며 카카오 로그인과는 별개입니다. 새로고침하거나 로그아웃하면 다시 로그인해야 합니다.</Notice>
      <FormField label="회원 ID" value={memberId} onChangeText={setMemberId} keyboardType="number-pad" autoCapitalize="none" autoCorrect={false} autoComplete="off" />
      <FormField label="비밀번호" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="off" textContentType="none" />
      <AppButton label="시연 계정으로 로그인" variant="primary" disabled={!memberId.trim() || !password} loading={mutation.pending} onPress={basicLogin} />
    </Panel>}
    <Panel>
      <AppButton label="전화번호로 계속하기" disabled={dataSource !== 'mock'} onPress={() => router.navigate('/auth/phone')} />
      <AppButton label="카카오 로그인 · 연동 준비 중" disabled onPress={() => {}} />
    </Panel>
    {dataSource === 'mock' && <Notice>데모 시작은 서버 인증이 아닌 화면 체험용입니다.</Notice>}
    <ErrorNotice message={mutation.error} />
    <AppButton label="데모 계정으로 시작" variant="primary" disabled={dataSource !== 'mock'} loading={mutation.pending} onPress={demoLogin} />
    <AppButton label="가입 폼 확인하기" disabled={dataSource !== 'mock'} onPress={() => router.navigate('/auth/signup')} />
    {dataSource === 'api' && <AppButton label="서버 토론 목록 보기" onPress={() => router.navigate('/discussions')} />}
    <AppButton label="로그인 없이 둘러보기" onPress={() => router.replace('/')} />
  </Page>;
}
