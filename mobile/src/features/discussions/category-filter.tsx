import { ScrollView, StyleSheet } from 'react-native';
import { AppButton } from '@/components/ui/app-button';
import { AppSpacing } from '@/constants/theme';
import { discussionCategories } from './filter-discussions';

export function CategoryFilter({ value, onChange }: { value: string; onChange: (category: string) => void }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
    {discussionCategories.map((category) => <AppButton key={category} label={category}
      selected={category === value} onPress={() => onChange(category)} />)}
  </ScrollView>;
}
const styles = StyleSheet.create({ row: { gap: AppSpacing.sm } });
