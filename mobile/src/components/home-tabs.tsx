import { Image } from 'expo-image';
import type { ComponentRef, Ref } from 'react';
import { router } from 'expo-router';
import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppColors, AppLayout, AppSpacing, AppTypography } from '@/constants/theme';

type MenuProps = Omit<TabTriggerSlotProps, 'ref'> & {
  ref?: Ref<ComponentRef<typeof Pressable>>;
  icon: number;
  label: string;
};
function MenuButton({ icon, label, isFocused, ...props }: MenuProps) {
  return <Pressable {...props} accessibilityRole="tab" accessibilityLabel={label}
    accessibilityState={{ selected: isFocused }} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
    <Image source={icon} style={styles.icon} contentFit="contain" />
    <Text style={[styles.label, isFocused && styles.active]}>{label}</Text>
  </Pressable>;
}

// 만들기는 탭이 아니라 Stack 화면을 여는 버튼입니다.
export default function HomeTabs() {
  const insets = useSafeAreaInsets();
  return <Tabs style={styles.container}>
    <TabSlot style={styles.slot} />
    <TabList asChild>
      <View style={StyleSheet.flatten([styles.menu, { paddingBottom: Math.max(AppSpacing.sm, insets.bottom) }])}>
        <TabTrigger name="home" href="/" asChild><MenuButton label="홈" icon={require('@/assets/icons/home.svg')} /></TabTrigger>
        <TabTrigger name="joined" href="/joined" asChild><MenuButton label="참여 중" icon={require('@/assets/icons/joined.svg')} /></TabTrigger>
        <Pressable accessibilityRole="button" accessibilityLabel="+ 만들기" onPress={() => router.navigate('/discussions/create')}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
          <Image source={require('@/assets/icons/create.svg')} style={styles.icon} contentFit="contain" />
          <Text style={styles.label}>만들기</Text>
        </Pressable>
        <TabTrigger name="my" href="/my" asChild><MenuButton label="마이" icon={require('@/assets/icons/profile.svg')} /></TabTrigger>
      {/* 기존 /explore 주소는 유지하되 메뉴에는 추가하지 않습니다. */}
      <TabTrigger name="explore" href="/explore" style={styles.hidden} />
      </View>
    </TabList>
  </Tabs>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.surface },
  slot: { flex: 1 },
  menu: { backgroundColor: AppColors.surface, paddingTop: AppSpacing.sm,
    paddingHorizontal: AppSpacing.sm, borderTopWidth: AppSpacing.xs, borderTopColor: AppColors.background,
    flexDirection: 'row', width: '100%', maxWidth: AppLayout.maxWidth, alignSelf: 'center' },
  item: { flex: 1, minWidth: AppLayout.touchTarget, minHeight: 60, gap: 2,
    paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  icon: { width: AppLayout.iconSize, height: AppLayout.iconSize },
  label: { ...AppTypography.tab, color: AppColors.textSecondary, textAlign: 'center' },
  active: { color: AppColors.primary },
  hidden: { display: 'none' },
  pressed: { opacity: 0.65 },
});
