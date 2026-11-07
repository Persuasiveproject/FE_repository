import { StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/ui/app-button';
import { AppSpacing } from '@/constants/theme';

type Props<T extends string> = { options: { value: T; label: string }[]; value: T | ''; onChange: (value: T) => void; disabled?: boolean; layout?: 'grid' | 'row' };
export function ChoiceGroup<T extends string>({ options, value, onChange, disabled, layout = 'grid' }: Props<T>) {
  return <View style={[styles.grid, layout === 'row' && styles.row]}>{options.map((option) => <View key={option.value} style={layout === 'row' ? styles.rowCell : styles.cell}>
    <AppButton label={option.label} selected={option.value === value} disabled={disabled} onPress={() => onChange(option.value)} />
  </View>)}</View>;
}
const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: AppSpacing.sm },
  cell: { flexGrow: 1, flexBasis: '45%' },
  // 버튼 모양은 유지하고 토론의 입장 필터만 한 줄로 배치합니다.
  row: { flexWrap: 'nowrap', gap: AppSpacing.xs },
  rowCell: { flex: 1, minWidth: 0 },
});
