import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { SideNav } from '@/components/side-nav';
import { AppColors } from '@/constants/theme';
import { useSideNav } from '@/hooks/use-wide';

// 웹의 태블릿·PC에서는 모든 화면 왼쪽에 메뉴를 고정한다. 휴대폰은 그대로(하단 탭).
export function AppShell({ children }: PropsWithChildren) {
  const nav = useSideNav();
  if (!nav) return <>{children}</>;
  return <View style={styles.row}>
    <SideNav variant={nav} />
    <View style={styles.body}>{children}</View>
  </View>;
}
const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', backgroundColor: AppColors.soft },
  body: { flex: 1, minWidth: 0 },
});
