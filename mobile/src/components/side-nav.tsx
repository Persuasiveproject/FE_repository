import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '@/components/ui/icon';
import { AppColors, AppSpacing, AppTypography, WideLayout } from '@/constants/theme';

type Item = { label: string; icon: IconName; href: '/' | '/explore' | '/joined' | '/discussions/create' | '/my'; match: (path: string) => boolean };
const ITEMS: Item[] = [
  { label: '홈', icon: 'home', href: '/', match: (p) => p === '/' },
  { label: '탐색', icon: 'search', href: '/explore', match: (p) => p.startsWith('/explore') || p === '/discussions' },
  { label: '참여 중', icon: 'chat', href: '/joined', match: (p) => p.startsWith('/joined') },
  { label: '만들기', icon: 'plus', href: '/discussions/create', match: (p) => p.startsWith('/discussions/create') },
  { label: '마이', icon: 'user', href: '/my', match: (p) => p.startsWith('/my') || p.startsWith('/account') },
];

// 모든 화면 왼쪽에 고정되는 메뉴. 토론 상세처럼 탭 밖의 화면에서도 보인다.
// rail: 세로 태블릿(아이콘 위·글자 아래), sidebar: 가로 태블릿·PC(아이콘과 글자 한 줄).
export function SideNav({ variant }: { variant: 'rail' | 'sidebar' }) {
  const path = usePathname();
  const sidebar = variant === 'sidebar';
  return <View accessibilityRole="tablist" style={[styles.nav, sidebar ? styles.sidebar : styles.rail]}>
    {ITEMS.map((item) => {
      const active = item.match(path);
      const tint = active ? AppColors.text : AppColors.textFaint;
      return <Pressable key={item.href} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={item.label}
        onPress={() => router.navigate(item.href)}
        style={({ pressed }) => [sidebar ? styles.rowItem : styles.railItem, active && styles.active, pressed && styles.pressed]}>
        <Icon name={item.icon} size={24} color={tint} strokeWidth={active ? 2.2 : 1.8} />
        <Text style={[sidebar ? styles.rowLabel : styles.railLabel, { color: tint }, active && styles.labelActive]}>{item.label}</Text>
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  nav: { backgroundColor: AppColors.surface, borderRightWidth: 1, borderRightColor: AppColors.border, gap: 2,
    paddingTop: 'max(16px, env(safe-area-inset-top))' as unknown as number },
  rail: { width: WideLayout.railWidth, alignItems: 'stretch', paddingHorizontal: 8 },
  sidebar: { width: WideLayout.sideNavWidth, paddingHorizontal: AppSpacing.md },
  railItem: { minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 14 },
  railLabel: { ...AppTypography.tab, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  rowItem: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: AppSpacing.md, paddingHorizontal: AppSpacing.md, borderRadius: 12 },
  rowLabel: { ...AppTypography.label, fontSize: 16 },
  labelActive: { fontWeight: '700' },
  active: { backgroundColor: AppColors.soft },
  pressed: { opacity: 0.6 },
});
