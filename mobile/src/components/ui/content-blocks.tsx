import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppColors, AppSpacing, AppSurfaces, AppTypography } from '@/constants/theme';

export function Heading({ children }: PropsWithChildren) { return <Text accessibilityRole="header" style={styles.heading}>{children}</Text>; }
export function Body({ children }: PropsWithChildren) { return <Text style={styles.body}>{children}</Text>; }
export function Caption({ children }: PropsWithChildren) { return <Text style={styles.caption}>{children}</Text>; }
export function Panel({ children }: PropsWithChildren) { return <View style={styles.panel}>{children}</View>; }
export function Notice({ children }: PropsWithChildren) { return <View style={styles.notice}><Text style={styles.body}>{children}</Text></View>; }
export function ErrorNotice({ message }: { message: string }) { return message ? <Text accessibilityRole="alert" style={styles.error}>{message}</Text> : null; }
export function Row({ children }: PropsWithChildren) { return <View style={styles.row}>{children}</View>; }
const styles = StyleSheet.create({
  heading: { ...AppTypography.heading, color: AppColors.text }, body: { ...AppTypography.body, color: AppColors.text },
  caption: { ...AppTypography.caption, color: AppColors.textSecondary }, panel: { ...AppSurfaces.card },
  notice: { padding: AppSpacing.lg, borderRadius: 12, backgroundColor: '#EAF7FD' },
  error: { ...AppTypography.body, color: '#B91C1C' }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: AppSpacing.sm },
});
