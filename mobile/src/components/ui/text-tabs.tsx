import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { AppColors, AppSpacing, AppTypography } from '@/constants/theme';

type Option<T extends string> = { value: T; label: string };
type Props<T extends string> = { options: Option<T>[]; value: T; onChange: (value: T) => void; size?: 'large' | 'medium' };

// B안의 큰 글자 탭: 칩 버튼 대신 글자 크기와 색으로 선택을 보여 준다.
// 화면 하단 탭과 구분하려고 접근성 역할은 button(선택 상태 포함)으로 둔다.
export function TextTabs<T extends string>({ options, value, onChange, size = 'medium' }: Props<T>) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
    {options.map((option) => {
      const active = option.value === value;
      return <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: active }} hitSlop={6}
        onPress={() => onChange(option.value)} style={({ pressed }) => pressed && styles.pressed}>
        <Text style={[size === 'large' ? styles.large : styles.medium, { color: active ? AppColors.text : AppColors.textFaint }]}>{option.label}</Text>
      </Pressable>;
    })}
  </ScrollView>;
}

const styles = StyleSheet.create({
  row: { gap: AppSpacing.lg + 2, alignItems: 'flex-end' },
  large: { ...AppTypography.display, fontSize: 24 },
  medium: { ...AppTypography.label, fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.6 },
});
