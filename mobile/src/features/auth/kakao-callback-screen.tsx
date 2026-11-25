import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Page } from '@/components/page';
import { ResourceState } from '@/components/resource-state';
import { AppButton } from '@/components/ui/app-button';
import { AppColors, AppTypography } from '@/constants/theme';
import { useSession } from '@/features/session/session-provider';
import { gateway } from '@/services/gateway';
import { finishAuth, kakaoRedirectUri, takeKakaoState } from './auth-flow';

// 카카오 로그인 후 돌아오는 주소(/auth/kakao). 인가 코드를 서버에 넘겨 로그인하거나 가입 화면으로 보낸다.
export default function KakaoCallbackScreen() {
  const { code, state, error } = useLocalSearchParams<{ code?: string; state?: string; error?: string }>();
  const { refresh } = useSession();
  // 돌아온 값 검사는 처음 그릴 때 한 번만 한다. state는 꺼내면 지워진다.
  const [check] = useState(() => {
    const expected = takeKakaoState();
    if (error) return error === 'access_denied' ? '카카오 로그인을 취소했어요.' : '카카오 로그인에 실패했어요.';
    if (!code || !state || state !== expected) return '로그인 요청을 확인하지 못했어요. 처음부터 다시 해 주세요.';
    return '';
  });
  const [failure, setFailure] = useState('');
  const started = useRef(false);
  useEffect(() => {
    if (check || started.current || !code) return; // 인가 코드는 한 번만 쓸 수 있다
    started.current = true;
    gateway.signInKakao!(code, kakaoRedirectUri())
      .then((result) => finishAuth(result, refresh))
      .catch((caught: unknown) => setFailure(caught instanceof Error ? caught.message : '카카오 로그인에 실패했어요.'));
  }, [check, code, refresh]);
  const message = check || failure;
  return <Page title="카카오 로그인" back={false} demo={false}>
    {!message && <ResourceState kind="loading" />}
    {!!message && <>
      <Text style={styles.message}>{message}</Text>
      <AppButton label="로그인 화면으로" variant="primary" onPress={() => router.replace('/auth/login')} />
    </>}
  </Page>;
}
const styles = StyleSheet.create({ message: { ...AppTypography.body, color: AppColors.text } });
