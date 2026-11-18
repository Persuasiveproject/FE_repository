import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DiscussionCard } from '@/components/discussion-card';
import { ResourceContent } from '@/components/resource-content';
import { ResourceState } from '@/components/resource-state';
import { TextTabs } from '@/components/ui/text-tabs';
import { ScreenHeader } from '@/components/screen-header';
import { AppButton } from '@/components/ui/app-button';
import { ErrorNotice } from '@/components/ui/content-blocks';
import { AppColors, AppLayout, AppSpacing, AppTypography } from '@/constants/theme';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { useMutation } from '@/hooks/use-mutation';
import { appendDebatePage, getPublicCategories, getPublicDebates, toDiscussion } from '@/services/public-api';
import type { CategoryDto, PublicDebatesQuery, PublicDebatesResponse } from '@/types/api';
import { CategoryFilter } from './category-filter';

// 기존 데모 목록의 카드·필터 스타일을 사용하고 데이터 조회만 서버에 연결합니다.
type ListHeader = { title?: string; back?: boolean };

export default function ApiListScreen({ title = '토론 목록', back = true }: ListHeader) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const loader = useCallback(() => getPublicCategories(), []);
  const { resource, reload } = useFocusResource(loader);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);
  return <SafeAreaView style={styles.screen}>
    <View style={styles.frame}>
      <ScreenHeader title={title} back={back} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <TextInput accessibilityLabel="토론 검색" placeholder="어떤 이야기가 궁금하세요?"
          placeholderTextColor={AppColors.textFaint} value={query} onChangeText={setQuery}
          maxLength={100} returnKeyType="search" style={styles.input} />
        <ResourceContent resource={resource} reload={reload}>{(categories) => <>
          <CategoryFilter value={categoryId} onChange={setCategoryId}
            options={[{ value: '', label: '전체' }, ...categories.map((item) => ({ value: item.id, label: item.name }))]} />
          <View style={styles.row}>
            <TextTabs value={status} onChange={setStatus} options={[{ value: 'OPEN', label: '문 연 토론' }, { value: 'CLOSED', label: '문 닫은 토론' }]} />
            
          </View>
          
          <ApiResults key={JSON.stringify([search, categoryId, status])} categories={categories} search={search} categoryId={categoryId} status={status} />
        </>}</ResourceContent>
      </ScrollView>
    </View>
  </SafeAreaView>;
}

function ApiResults({ categories, search, categoryId, status }: { categories: CategoryDto[]; search: string; categoryId: string; status: 'OPEN' | 'CLOSED' }) {
  const sequence = useRef(0);
  const loader = useCallback(async () => {
    const number = ++sequence.current;
    const page = await getPublicDebates({ query: search, categoryId: categoryId || undefined, status });
    return { page, number };
  }, [search, categoryId, status]);
  const { resource, reload } = useFocusResource(loader);
  return <ResourceContent resource={resource} reload={reload}>{({ page, number }) =>
    // 재조회나 필터 변경 때 이전 페이지의 항목·cursor·오류를 함께 초기화합니다.
    <LoadedResults key={number} firstPage={page} categories={categories} query={{ query: search, categoryId: categoryId || undefined, status }} />
  }</ResourceContent>;
}

function LoadedResults({ firstPage, categories, query }: { firstPage: PublicDebatesResponse; categories: CategoryDto[]; query: PublicDebatesQuery }) {
  const [items, setItems] = useState(firstPage.data.debates);
  const [cursor, setCursor] = useState(firstPage.meta.nextCursor);
  const requested = useRef<string[]>([]);
  const mutation = useMutation();
  return <>
    {items.length === 0 && <ResourceState kind="empty" message="해당하는 서버 토론이 없습니다." />}
    {items.map((item) => <DiscussionCard key={item.id} discussion={toDiscussion(item, categories)}
      onPress={() => router.navigate({ pathname: '/discussions/[id]', params: { id: item.id } })} />)}
    <ErrorNotice message={mutation.error} />
    {cursor !== null && <AppButton label={mutation.error ? '다음 페이지 다시 시도' : '토론 더 보기'} loading={mutation.pending}
      onPress={() => {
        const next = cursor;
        void mutation.run(async () => {
          const page = await getPublicDebates({ ...query, cursor: next });
          const combined = appendDebatePage(items, page, [...requested.current, next]);
          return { page, combined };
        }, ({ page, combined }) => {
          requested.current.push(next); setItems(combined); setCursor(page.meta.nextCursor);
        });
      }} />}
  </>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.surface },
  frame: { flex: 1, backgroundColor: AppColors.background, width: '100%', maxWidth: AppLayout.maxWidth, alignSelf: 'center', gap: AppSpacing.xs },
  content: { padding: AppSpacing.xl, gap: AppSpacing.lg },
  input: { ...AppTypography.body, color: AppColors.text, minHeight: 50, borderRadius: 25, paddingHorizontal: AppSpacing.xl, backgroundColor: AppColors.soft },
  row: { flexDirection: 'row', gap: AppSpacing.sm },
  option: { flex: 1 },
});
