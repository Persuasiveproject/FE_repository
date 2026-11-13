import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { router } from 'expo-router';
import { Image, Pressable, useColorScheme, View, StyleSheet } from 'react-native';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

import { ThemedText } from './themed-text';

// 웹도 모바일 앱(app-tabs.tsx)과 같은 하단 탭 구성을 사용합니다.
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
            <TabButton icon="home">Home</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton icon="explore">Explore</TabButton>
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
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const tint = isFocused ? colors.text : colors.textSecondary;
  const source = icons[icon];

  return (
    <Pressable {...props} accessibilityRole="tab" accessibilityState={{ selected: !!isFocused }}
      style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <View style={[styles.iconWrap, isFocused && { backgroundColor: colors.backgroundElement }]}>
        {'image' in source
          ? <Image source={source.image} style={[styles.icon, { tintColor: tint }]} />
          : <SymbolView name={source.symbol} size={22} tintColor={tint} />}
      </View>
      <ThemedText type="small" style={[styles.label, { color: tint }]}>{children}</ThemedText>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <View {...props} style={[styles.bar, { backgroundColor: colors.background, borderTopColor: colors.backgroundElement }]}>
      <View style={styles.inner}>{props.children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  slot: { flex: 1 },
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.one,
    // 아이폰 홈 표시줄 영역만큼 아래 여백을 둡니다.
    paddingBottom: 'max(8px, env(safe-area-inset-bottom))' as unknown as number,
    alignItems: 'center',
  },
  inner: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: MaxContentWidth,
    justifyContent: 'space-around',
  },
  tabButton: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: Spacing.half },
  iconWrap: { paddingHorizontal: Spacing.three, paddingVertical: 2, borderRadius: Spacing.three },
  icon: { width: 22, height: 22 },
  label: { fontSize: 11 },
  pressed: { opacity: 0.7 },
});
