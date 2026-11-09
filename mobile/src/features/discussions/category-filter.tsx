import { ScrollView, StyleSheet } from 'react-native';
import { AppButton } from '@/components/ui/app-button';
import { AppSpacing } from '@/constants/theme';
import { discussionCategories } from './filter-discussions';

type Option = { value: string; label: string };
type Props = { value: string; onChange: (category: string) => void; options?: Option[] };
export function CategoryFilter({ value, onChange, options = discussionCategories.map((category) => ({ value: category, label: category })) }: Props) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
    {options.map((category) => <AppButton key={category.value} label={category.label}
      selected={category.value === value} onPress={() => onChange(category.value)} />)}
  </ScrollView>;
}
const styles = StyleSheet.create({ row: { gap: AppSpacing.sm } });
