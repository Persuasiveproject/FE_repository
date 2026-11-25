import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Page } from '@/components/page';
import { AppButton } from '@/components/ui/app-button';
import { ErrorNotice } from '@/components/ui/content-blocks';
import { FormField } from '@/components/ui/form-field';
import { AppColors, AppSpacing, AppTypography } from '@/constants/theme';
import { useSession } from '@/features/session/session-provider';
import { useMutation } from '@/hooks/use-mutation';
import { dataSource, gateway } from '@/services/gateway';
import { finishAuth, kakaoAvailable, startKakaoLogin } from './auth-flow';

// 로그인 = 가입 시작점. 카카오 또는 휴대폰 번호 중 하나로 확인하고, 처음이면 가입 화면으로 이어진다.
export default function LoginScreen() {
  const { refresh } = useSession();
  const mutation = useMutation();
  const [showDemo, setShowDemo] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [password, setPassword] = useState('');
  const kakaoReady = dataSource === 'mock' || kakaoAvailable();

  function kakao() {
    if (dataSource === 'mock') {
      // 데모: 카카오에 다녀온 것처럼 가입 화면으로 바로 간다.
      void mutation.run(() => gateway.signInKakao!('demo', ''), (result) => void finishAuth(result, refresh));
      return;
    }
    startKakaoLogin();
  }
  function basicLogin() {
    void mutation.run(async () => {
      try {
        if (!gateway.signInBasic) throw new Error('시연 계정 로그인을 사용할 수 없습니다.');
        await gateway.signInBasic({ memberId: memberId.trim(), password }); await refresh();
      } finally { setPassword(''); }
    }, () => router.replace('/'));
  }
  function demoLogin() {
    void mutation.run(async () => { await gateway.signInDemo(); await refresh(); }, () => router.replace('/'));
  }

  return <Page title="로그인" demo={false}>
    <View style={styles.hero}>
      <Text accessibilityRole="header" style={styles.title}>내 생각을 영업해 보세요</Text>
    </View>

    <View style={styles.actions}>
      <Pressable accessibilityRole="button" accessibilityLabel="카카오로 시작하기" disabled={!kakaoReady || mutation.pending} onPress={kakao}
        style={({ pressed }) => [styles.kakao, (!kakaoReady || mutation.pending) && styles.disabled, pressed && styles.pressed]}>
        <Text style={styles.kakaoText}>카카오로 시작하기</Text>
      </Pressable>
      <AppButton label="휴대폰 번호로 시작하기" variant="primary" disabled={mutation.pending} onPress={() => router.navigate('/auth/phone')} />
    </View>

    <ErrorNotice message={mutation.error} />

    <View style={styles.more}>
      {dataSource === 'mock' && <AppButton label="데모 계정으로 바로 둘러보기" disabled={mutation.pending} onPress={demoLogin} />}
      {dataSource === 'api' && <Pressable accessibilityRole="button" onPress={() => setShowDemo((v) => !v)} style={styles.link}>
        <Text style={styles.linkText}>{showDemo ? '시연 계정 로그인 닫기' : '시연 계정으로 로그인'}</Text>
      </Pressable>}
      {dataSource === 'api' && showDemo && <View style={styles.demo}>
        <FormField label="회원 ID" value={memberId} onChangeText={setMemberId} keyboardType="number-pad" autoCapitalize="none" autoCorrect={false} autoComplete="off" />
        <FormField label="비밀번호" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="off" textContentType="none" />
        <AppButton label="시연 계정으로 로그인" disabled={!memberId.trim() || !password} loading={mutation.pending} onPress={basicLogin} />
      </View>}
      <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.link}>
        <Text style={styles.linkText}>로그인 없이 둘러보기</Text>
      </Pressable>
    </View>
  </Page>;
}

const styles = StyleSheet.create({
  hero: { gap: AppSpacing.sm, paddingTop: AppSpacing.lg, paddingBottom: AppSpacing.md },
  title: { ...AppTypography.title, fontSize: 28, lineHeight: 36, color: AppColors.text },
  body: { ...AppTypography.body, color: AppColors.textSecondary },
  actions: { gap: AppSpacing.md },
  // 카카오 로그인 버튼 색(#FEE500)과 글자색은 카카오 디자인 가이드를 따른다.
  kakao: { minHeight: 52, borderRadius: 999, backgroundColor: '#FEE500', alignItems: 'center', justifyContent: 'center' },
  kakaoText: { ...AppTypography.label, fontSize: 16, fontWeight: '700', color: 'rgba(0,0,0,0.85)' },
  more: { gap: AppSpacing.sm, paddingTop: AppSpacing.lg, borderTopWidth: 1, borderTopColor: AppColors.border },
  demo: { gap: AppSpacing.md },
  link: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  linkText: { ...AppTypography.caption, fontSize: 14, fontWeight: '600', color: AppColors.textSecondary, textDecorationLine: 'underline' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
});
