import { router } from 'expo-router';
import { Page } from '@/components/page';
import { AppButton } from '@/components/ui/app-button';
import { Notice } from '@/components/ui/content-blocks';

export default function NotFoundScreen() {
  return <Page title="페이지를 찾을 수 없습니다" demo={false}>
    <Notice>주소를 확인하거나 홈에서 다시 시작해 주세요.</Notice>
    <AppButton label="홈으로" onPress={() => router.replace('/')} />
  </Page>;
}
