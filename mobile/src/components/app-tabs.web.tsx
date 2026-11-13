import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { router } from 'expo-router';
import { Image, Pressable, Text, View, StyleSheet } from 'react-native';

import { AppColors, AppLayout, AppSpacing, AppTypography } from '@/constants/theme';


// 웹도 모바일 앱(app-tabs.tsx)과 같은 하단 탭 구성을 사용합니다.
// 색은 OS 다크 모드와 상관없이 앱 화면과 같은 AppColors를 씁니다.
type TabIcon = { image: number } | { symbol: SymbolViewProps['name'] };
const icons: Record<string, TabIcon> = {
  home: { image: require('@/assets/images/tabIcons/home.png') },
  explore: { image: require('@/assets/images/tabIcons/explore.png') },
  joined: { symbol: { ios: 'bubble.left.and.bubble.right', android: 'forum', web: 'forum' } },
  create: { symbol: { ios: 'plus.app', android: 'add_box', web: 'add_box' } },
  my: { symbol: { ios: 'person', android: 'person', web: 'person' } },
};

export default function AppTabs() {
  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton icon="home">홈</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton icon="explore">탐색</TabButton>
          </TabTrigger>
          <TabTrigger name="joined" href="/joined" asChild>
            <TabButton icon="joined">참여 중</TabButton>
          </TabTrigger>
          <TabButton icon="create" isFocused={false} onPress={() => router.navigate('/discussions/create')}>
            만들기
          </TabButton>
          <TabTrigger name="my" href="/my" asChild>
            <TabButton icon="my">마이</TabButton>
          </TabTrigger>
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
  const tint = isFocused ? AppColors.text : AppColors.textSecondary;
  const source = icons[icon];

  return (
    <Pressable {...props} accessibilityRole="tab" accessibilityState={{ selected: !!isFocused }}
      style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <View style={styles.iconWrap}>
        {'image' in source
          ? <Image source={source.image} style={[styles.icon, { tintColor: tint }]} />
          : <SymbolView name={source.symbol} size={22} tintColor={tint} />}
      </View>
      <Text style={[styles.label, { color: tint }, isFocused && styles.labelActive]}>{children}</Text>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.bar}>
      <View style={styles.inner}>{props.children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AppColors.background },
  slot: { flex: 1 },
  bar: {
    backgroundColor: AppColors.surface,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
    paddingTop: AppSpacing.xs,
    // 아이폰 홈 표시줄 영역만큼 아래 여백을 둡니다.
    paddingBottom: 'max(6px, env(safe-area-inset-bottom))' as unknown as number,
    alignItems: 'center',
  },
  inner: { flexDirection: 'row', width: '100%', maxWidth: AppLayout.maxWidth },
  tabButton: { flex: 1, alignItems: 'center', gap: 2, minHeight: AppLayout.touchTarget, justifyContent: 'center' },
  iconWrap: { height: 24, justifyContent: 'center' },
  icon: { width: 22, height: 22 },
  label: { ...AppTypography.tab },
  labelActive: { fontWeight: '700' },
  pressed: { opacity: 0.6 },
});
