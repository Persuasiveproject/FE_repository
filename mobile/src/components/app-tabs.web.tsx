import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { router } from 'expo-router';
import { Pressable, Text, View, StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { AppColors, AppLayout, AppTypography } from '@/constants/theme';
import { useSideNav } from '@/hooks/use-wide';

// 웹 탭. 휴대폰에서는 하단 탭으로 보이고, 태블릿·PC에서는 모든 화면에 붙는 왼쪽 메뉴(AppShell)가
// 대신하므로 하단 탭은 숨긴다. 탭 경로 정의는 그대로 두어야 해서 목록은 남기고 화면에서만 감춘다.
const icons: Record<string, IconName> = { home: 'home', explore: 'search', joined: 'chat', create: 'plus', my: 'user' };

export default function AppTabs() {
  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild><TabButton icon="home">홈</TabButton></TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild><TabButton icon="explore">탐색</TabButton></TabTrigger>
          <TabTrigger name="joined" href="/joined" asChild><TabButton icon="joined">참여 중</TabButton></TabTrigger>
          <TabButton icon="create" isFocused={false} onPress={() => router.navigate('/discussions/create')}>만들기</TabButton>
          <TabTrigger name="my" href="/my" asChild><TabButton icon="my">마이</TabButton></TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  icon,
  ref: _ref,
  ...props
}: TabTriggerSlotProps & { icon: keyof typeof icons }) {
  const tint = isFocused ? AppColors.text : AppColors.textFaint;
  return (
    <Pressable {...props} accessibilityRole="tab" accessibilityState={{ selected: !!isFocused }}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <Icon name={icons[icon]} size={26} color={tint} strokeWidth={isFocused ? 2.2 : 1.8} />
      <Text style={[styles.label, { color: tint }, isFocused && styles.labelActive]}>{children}</Text>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const hidden = useSideNav() !== null;
  return <View {...props} style={[styles.bar, hidden && styles.hidden]}><View style={styles.barInner}>{props.children}</View></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AppColors.background },
  slot: { flex: 1 },
  // 휴대폰 하단 탭: 아이콘 26, 글자 12. 아이폰 홈 표시줄 영역만큼 아래 여백을 둔다.
  bar: {
    backgroundColor: AppColors.surface, borderTopWidth: 1, borderTopColor: AppColors.border, paddingTop: 6,
    paddingBottom: 'max(8px, env(safe-area-inset-bottom))' as unknown as number, alignItems: 'center',
  },
  hidden: { display: 'none' },
  barInner: { flexDirection: 'row', width: '100%', maxWidth: AppLayout.maxWidth },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 54 },
  label: { ...AppTypography.tab, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  labelActive: { fontWeight: '700' },
  pressed: { opacity: 0.6 },
});
