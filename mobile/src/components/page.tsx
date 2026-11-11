import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/screen-header';
import { AppColors, AppLayout, AppSpacing, AppTypography } from '@/constants/theme';
import { dataSource } from '@/services/gateway';

type Props = PropsWithChildren<{ title: string; back?: boolean; footer?: ReactNode; demo?: boolean; tab?: boolean }>;
export function Page({ title, children, back = true, footer, demo = true, tab = false }: Props) {
  return <SafeAreaView style={styles.safe} edges={tab ? ['top', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}>
    <KeyboardAvoidingView style={styles.frame} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={title} back={back} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {demo && <Text style={styles.demo}>{dataSource === 'mock' ? '데모 모드 · 데이터는 이 앱 실행 중에만 유지됩니다.' : '실제 개발 서버 · 시연용 Basic 인증'}</Text>}
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
});
