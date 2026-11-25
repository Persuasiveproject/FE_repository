import { router } from 'expo-router';
import { Platform } from 'react-native';
import type { AuthResult } from '@/types/core';

// 휴대폰·카카오 확인 뒤 가입 화면으로 넘길 가입표. 주소창에 남기지 않으려고 메모리에만 둔다.
type PendingSignup = { signupToken: string; method: 'PHONE' | 'KAKAO' };
let pending: PendingSignup | null = null;
export const getPendingSignup = () => pending;
export const clearPendingSignup = () => { pending = null; };

// 확인이 끝난 뒤 공통 이동: 이미 회원이면 홈, 처음이면 가입 화면.
export async function finishAuth(result: AuthResult, refresh: () => Promise<void>) {
  if (result.status === 'LOGGED_IN') {
    pending = null;
    await refresh();
    router.replace('/');
    return;
  }
  pending = { signupToken: result.signupToken, method: result.method };
  router.replace('/auth/signup');
}

const KAKAO_AUTHORIZE = 'https://kauth.kakao.com/oauth/authorize';
const STATE_KEY = 'yeongeopjung.kakao.state';
export const kakaoClientId = () => process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY?.trim() ?? '';
// 카카오 개발자 콘솔과 서버 KAKAO_REDIRECT_URIS에 같은 주소를 등록해야 한다.
export const kakaoRedirectUri = () => (Platform.OS === 'web' && typeof window !== 'undefined' ? `${window.location.origin}/auth/kakao` : '');
export const kakaoAvailable = () => Platform.OS === 'web' && !!kakaoClientId();

export function startKakaoLogin() {
  const state = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  window.sessionStorage.setItem(STATE_KEY, state);
  const query = new URLSearchParams({ client_id: kakaoClientId(), redirect_uri: kakaoRedirectUri(), response_type: 'code', state });
  window.location.assign(`${KAKAO_AUTHORIZE}?${query}`);
}

// 카카오가 돌려준 state가 우리가 보낸 것과 같아야 한다(다른 사이트가 만든 로그인 요청을 막는다).
export function takeKakaoState(): string | null {
  if (typeof window === 'undefined') return null;
  const value = window.sessionStorage.getItem(STATE_KEY);
  window.sessionStorage.removeItem(STATE_KEY);
  return value;
}
