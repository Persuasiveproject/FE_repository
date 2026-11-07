import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { AppColors, AppSpacing, AppSurfaces, AppTypography } from '@/constants/theme';

type Props = TextInputProps & { label: string; error?: string; counter?: boolean };
export function FormField({ label, error, counter, multiline, style, ...props }: Props) {
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput {...props} accessibilityLabel={label} multiline={multiline}
      placeholderTextColor={AppColors.textSecondary} style={[styles.input, multiline && styles.multiline, style]} />
    {counter && props.maxLength && <Text style={styles.helper}>{props.value?.length ?? 0} / {props.maxLength.toLocaleString()}</Text>}
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  field: { gap: AppSpacing.sm }, label: { ...AppTypography.caption, color: AppColors.textSecondary },
  input: { ...AppSurfaces.button, ...AppTypography.body, color: AppColors.text, paddingVertical: AppSpacing.md },
  multiline: { minHeight: 132, textAlignVertical: 'top' },
  helper: { ...AppTypography.caption, color: AppColors.textSecondary },
  error: { ...AppTypography.caption, color: '#B91C1C' },
});
