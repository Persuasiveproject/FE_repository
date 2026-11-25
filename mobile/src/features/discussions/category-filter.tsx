import { Pressable, StyleSheet, Text, View } from 'react-native';
import { categoryColor } from '@/components/ui/category-chip';
import { AppColors, AppTypography } from '@/constants/theme';
import { discussionCategories } from './filter-discussions';

type Option = { value: string; label: string };
type Props = { value: string; onChange: (category: string) => void; options?: Option[] };

// 탐색 화면 왼쪽의 세로 카테고리 목록. 누르면 오른쪽 목록이 그 카테고리 토론으로 바뀐다.
// 가로 스크롤에 숨기지 않아 카테고리가 늘어도 모두 보이고, 고른 항목은 배경과 굵기로 표시한다.
export function CategoryFilter({ value, onChange, options = discussionCategories.map((category) => ({ value: category, label: category })) }: Props) {
  return <View accessibilityLabel="주제" style={styles.rail}>
    {options.map((option) => {
      const selected = option.value === value;
      // '전체'를 뺀 주제는 홈·목록의 카테고리 칩과 같은 색을 쓴다.
      const color = option.label === '전체' ? null : categoryColor(option.label);
      return <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected }}
        accessibilityLabel={`${option.label}${selected ? ', 선택됨' : ''}`} onPress={() => onChange(option.value)}
        style={({ pressed }) => [styles.item, selected && styles.selected, selected && color && { backgroundColor: color.bg }, pressed && !selected && styles.pressed]}>
        <View style={styles.row}>
          {color && <View style={[styles.dot, { backgroundColor: color.fg }]} />}
          <Text style={[styles.label, selected && styles.selectedLabel, selected && color && { color: color.fg }]}>{option.label}</Text>
        </View>
      </Pressable>;
    })}
  </View>;
}

export const CATEGORY_RAIL_WIDTH = 96;

const styles = StyleSheet.create({
  rail: { width: CATEGORY_RAIL_WIDTH, gap: 2 },
  item: { minHeight: 44, justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12 },
  selected: { backgroundColor: AppColors.soft },
  pressed: { backgroundColor: AppColors.soft, opacity: 0.7 },
  label: { ...AppTypography.caption, fontSize: 14, lineHeight: 19, fontWeight: '500', color: AppColors.textSecondary },
  selectedLabel: { fontWeight: '700', color: AppColors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 2 },
});
