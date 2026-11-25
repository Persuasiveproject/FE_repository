import { router } from 'expo-router';
import { Page } from '@/components/page';
import { AppButton } from '@/components/ui/app-button';

export default function NotFoundScreen() {
  return <Page title="페이지를 찾을 수 없습니다" demo={false}>
    <AppButton label="홈으로" onPress={() => router.replace('/')} />
  </Page>;
}
