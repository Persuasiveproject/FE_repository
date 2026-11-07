import { Pressable, StyleSheet, Text } from 'react-native';
import { AppColors, AppSurfaces, AppTypography } from '@/constants/theme';

type Props = { label: string; onPress: () => void; disabled?: boolean; selected?: boolean };
export function AppButton({ label, onPress, disabled = false, selected = false }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled, selected }}
      disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.button, selected && styles.selected, (pressed || disabled) && styles.dim]}>
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
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
