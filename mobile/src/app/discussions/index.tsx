import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DiscussionCard } from '@/components/discussion-card';
import { ResourceState } from '@/components/resource-state';
import { TextTabs } from '@/components/ui/text-tabs';
import { ScreenHeader } from '@/components/screen-header';
import { AppColors, AppLayout, AppSpacing, AppTypography } from '@/constants/theme';
import { CategoryFilter } from '@/features/discussions/category-filter';
import { filterDiscussions } from '@/features/discussions/filter-discussions';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { getDiscussions } from '@/services/discussions';
import { dataSource } from '@/services/gateway';
import ApiListScreen from '@/features/discussions/api-list-screen';

type ListHeader = { title?: string; back?: boolean };

// 하단 탭의 '탐색'도 이 화면을 제목만 바꿔 재사용합니다.
export default function DiscussionListScreen({ title = '토론 목록', back = true }: ListHeader) {
  if (dataSource === 'api') return <ApiListScreen title={title} back={back} />;
  return <MockDiscussionListScreen title={title} back={back} />;
}

function MockDiscussionListScreen({ title, back }: ListHeader) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('전체');
  const [status, setStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const { resource, reload: retry } = useFocusResource(getDiscussions);
  const items = resource.status === 'success' ? filterDiscussions(resource.data, query, category, status) : [];
  return <SafeAreaView style={styles.screen}>
    <View style={styles.frame}>
      <ScreenHeader title={title ?? '토론 목록'} back={back} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <TextInput accessibilityLabel="토론 검색" placeholder="어떤 이야기가 궁금하세요?"
          placeholderTextColor={AppColors.textFaint} value={query} onChangeText={setQuery}
          returnKeyType="search" style={styles.input} />
        <CategoryFilter value={category} onChange={setCategory} />
        <View style={styles.row}>
          <TextTabs value={status} onChange={setStatus} options={[{ value: 'OPEN', label: '문 연 토론' }, { value: 'CLOSED', label: '문 닫은 토론' }]} />
          
        </View>
        {resource.status === 'loading' && <ResourceState kind="loading" />}
        {resource.status === 'error' && <ResourceState kind="error" onRetry={retry} />}
        {resource.status === 'success' && (items.length === 0 ? <ResourceState kind="empty" /> :
          items.map((item) => <DiscussionCard key={item.id} discussion={item} onPress={() => router.navigate({
            pathname: '/discussions/[id]', params: { id: String(item.id) },
          })} />))}
      </ScrollView>
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.surface },
  frame: { flex: 1, backgroundColor: AppColors.background, width: '100%', maxWidth: AppLayout.maxWidth, alignSelf: 'center', gap: AppSpacing.xs },
  content: { padding: AppSpacing.xl, gap: AppSpacing.lg },
  input: { ...AppTypography.body, color: AppColors.text, minHeight: 50, borderRadius: 25, paddingHorizontal: AppSpacing.xl, backgroundColor: AppColors.soft },
  row: { flexDirection: 'row', gap: AppSpacing.sm },
  option: { flex: 1 },
});
