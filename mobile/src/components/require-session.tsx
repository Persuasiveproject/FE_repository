import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { AppButton } from '@/components/ui/app-button';
import { Notice } from '@/components/ui/content-blocks';
import { ResourceState } from '@/components/resource-state';
import { useSession } from '@/features/session/session-provider';

export function RequireSession({ children }: PropsWithChildren) {
  const { profile, ready } = useSession();
  if (!ready) return <ResourceState kind="loading" message="세션을 확인하고 있어요" />;
  if (!profile) return <><Notice>읽기는 로그인 없이 가능합니다. 참여하려면 로그인해 주세요.</Notice>
    <AppButton label="로그인 화면으로" onPress={() => router.navigate('/auth/login')} /></>;
  return <>{children}</>;
}
