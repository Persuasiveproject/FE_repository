import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { AppColors, AppRadius, AppSpacing, AppTypography } from '@/constants/theme';

type Props = TextInputProps & { label: string; error?: string; counter?: boolean };
export function FormField({ label, error, counter, multiline, style, ...props }: Props) {
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput {...props} accessibilityLabel={label} multiline={multiline}
      placeholderTextColor={AppColors.textFaint} style={[styles.input, multiline && styles.multiline, style]} />
    {counter && props.maxLength && <Text style={styles.helper}>{props.value?.length ?? 0} / {props.maxLength.toLocaleString()}</Text>}
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  field: { gap: AppSpacing.sm }, label: { ...AppTypography.label, fontSize: 14, fontWeight: '700', color: AppColors.text },
  // B안 입력칸: 연한 면 + 모서리 16. 알약 모양 버튼과 구분한다.
  input: { ...AppTypography.body, color: AppColors.text, minHeight: 50, borderRadius: AppRadius.field, paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md, backgroundColor: AppColors.soft, borderWidth: 1.5, borderColor: AppColors.soft },
  multiline: { minHeight: 160, textAlignVertical: 'top', lineHeight: 25 },
  helper: { ...AppTypography.caption, color: AppColors.textFaint, textAlign: 'right' },
  error: { ...AppTypography.caption, color: AppColors.danger },
});
