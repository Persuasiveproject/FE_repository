import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DiscussionCard } from '@/components/discussion-card';
import { ResourceState } from '@/components/resource-state';
import { ScreenHeader } from '@/components/screen-header';
import { AppButton } from '@/components/ui/app-button';
import { AppColors, AppLayout, AppSpacing, AppSurfaces, AppTypography } from '@/constants/theme';
import { CategoryFilter } from '@/features/discussions/category-filter';
import { filterDiscussions } from '@/features/discussions/filter-discussions';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { getDiscussions } from '@/services/discussions';
import { dataSource } from '@/services/gateway';
import ApiListScreen from '@/features/discussions/api-list-screen';

export default function DiscussionListScreen() {
  if (dataSource === 'api') return <ApiListScreen />;
  return <MockDiscussionListScreen />;
}

function MockDiscussionListScreen() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('전체');
  const [status, setStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const { resource, reload: retry } = useFocusResource(getDiscussions);
  const items = resource.status === 'success' ? filterDiscussions(resource.data, query, category, status) : [];
  return <SafeAreaView style={styles.screen}>
    <View style={styles.frame}>
      <ScreenHeader title="토론 목록" back />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <TextInput accessibilityLabel="토론 검색" placeholder="관심 있는 주제를 검색해 보세요"
          placeholderTextColor={AppColors.textSecondary} value={query} onChangeText={setQuery}
          returnKeyType="search" style={styles.input} />
        <CategoryFilter value={category} onChange={setCategory} />
        <View style={styles.row}>
          <View style={styles.option}><AppButton label="진행 중" selected={status === 'OPEN'} onPress={() => setStatus('OPEN')} /></View>
          <View style={styles.option}><AppButton label="종료" selected={status === 'CLOSED'} onPress={() => setStatus('CLOSED')} /></View>
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
  input: { ...AppSurfaces.button, ...AppTypography.body, color: AppColors.text },
  row: { flexDirection: 'row', gap: AppSpacing.sm },
  option: { flex: 1 },
});
