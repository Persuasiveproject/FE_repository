import type { PropsWithChildren, ReactNode } from 'react';
import { useWide } from '@/hooks/use-wide';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/screen-header';
import { AppColors, AppLayout, AppSpacing, AppTypography, PanelSurface, WideLayout } from '@/constants/theme';

// aside: 넓은 화면에서 본문 오른쪽에 놓을 패널들(휴대폰에서는 보이지 않음).
type Props = PropsWithChildren<{ title: string; back?: boolean; footer?: ReactNode; demo?: boolean; tab?: boolean; aside?: ReactNode }>;
export function Page({ title, children, back = true, footer, demo = true, tab = false, aside }: Props) {
  const wide = useWide();
  // PC: 회색 바탕 위에 본문 패널과 오른쪽 보조 패널을 나란히 둔다.
  if (wide) return <SafeAreaView style={styles.safeWide} edges={['top', 'left', 'right']}>
    <ScrollView contentContainerStyle={styles.canvas} keyboardShouldPersistTaps="handled">
      <View style={[styles.wideInner, !aside && styles.wideSolo]}>
        <ScreenHeader title={title} back={back} />
        <View style={styles.columns}>
          <View style={[styles.mainPanel, !aside && styles.mainSolo]}>{children}{footer}</View>
          {aside && <View style={styles.aside}>{aside}</View>}
        </View>
      </View>
    </ScrollView>
  </SafeAreaView>;
  return <SafeAreaView style={styles.safe} edges={tab ? ['top', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}>
    <KeyboardAvoidingView style={styles.frame} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={title} back={back} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        
        {children}
      </ScrollView>
      {footer && <View style={styles.footer}>{footer}</View>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.surface },
  frame: { flex: 1, width: '100%', maxWidth: AppLayout.maxWidth, alignSelf: 'center', backgroundColor: AppColors.background },
  content: { padding: AppSpacing.xl, gap: AppSpacing.lg, flexGrow: 1 },
  footer: { padding: AppSpacing.lg, gap: AppSpacing.sm, backgroundColor: AppColors.surface },
  demo: { ...AppTypography.caption, color: AppColors.textSecondary },
  safeWide: { flex: 1, backgroundColor: AppColors.soft },
  canvas: { paddingHorizontal: 32, paddingBottom: 40, alignItems: 'center' },
  wideInner: { width: '100%', maxWidth: WideLayout.maxWidth, gap: 8 },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: WideLayout.gap },
  mainPanel: { ...PanelSurface, flex: 1, minWidth: 0, gap: AppSpacing.lg },
  mainSolo: { maxWidth: WideLayout.mainMaxWidth },
  wideSolo: { maxWidth: WideLayout.mainMaxWidth },
  aside: { width: WideLayout.panelWidth, gap: WideLayout.gap },
});
