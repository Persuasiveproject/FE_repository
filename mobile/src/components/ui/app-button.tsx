import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { AppColors, AppSurfaces, AppTypography } from '@/constants/theme';

type Props = { label: string; onPress: () => void; disabled?: boolean; selected?: boolean; loading?: boolean; variant?: 'primary' | 'secondary' };
export function AppButton({ label, onPress, disabled = false, selected = false, loading = false, variant = 'secondary' }: Props) {
  const filled = selected || variant === 'primary';
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || loading, selected, busy: loading }}
      disabled={disabled || loading} onPress={onPress}
      style={({ pressed }) => [styles.button, filled && styles.selected, (pressed || disabled || loading) && styles.dim]}>
      {loading && <ActivityIndicator size="small" color={filled ? AppColors.surface : AppColors.primary} />}
      <Text style={[styles.label, filled && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: { ...AppSurfaces.button, justifyContent: 'center', alignItems: 'center' },
  selected: { backgroundColor: AppColors.primary },
  label: { ...AppTypography.label, color: AppColors.text, textAlign: 'center' },
  selectedLabel: { color: AppColors.surface },
  dim: { opacity: 0.65 },
});
