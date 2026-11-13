import { NativeTabs } from 'expo-router/native-tabs';
import { router } from 'expo-router';

import { AppColors } from '@/constants/theme';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={AppColors.surface}
      indicatorColor={AppColors.background}
      iconColor={{ default: AppColors.textSecondary, selected: AppColors.text }}
      labelStyle={{ default: { color: AppColors.textSecondary }, selected: { color: AppColors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>홈</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>탐색</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="joined">
        <NativeTabs.Trigger.Label>참여 중</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bubble.left.and.bubble.right" md="forum" />
      </NativeTabs.Trigger>

      {/* 선택은 막고 탭 누름 이벤트로 기존 Stack 생성 화면을 엽니다. */}
      <NativeTabs.Trigger name="create-action" disabled
        listeners={{ tabPress: () => router.navigate('/discussions/create') }}>
        <NativeTabs.Trigger.Label>만들기</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="plus.app" md="add_box" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="my">
        <NativeTabs.Trigger.Label>마이</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
