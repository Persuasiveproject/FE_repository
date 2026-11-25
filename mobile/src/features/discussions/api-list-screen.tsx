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
import { AppColors, AppLayout, AppSpacing, AppTypography, PanelSurface, WideLayout } from '@/constants/theme';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { useMutation } from '@/hooks/use-mutation';
import { appendDebatePage, getPublicCategories, getPublicDebates, toDiscussion } from '@/services/public-api';
import type { CategoryDto, PublicDebatesQuery, PublicDebatesResponse } from '@/types/api';
import { CategoryFilter } from './category-filter';
import { PopularPanel } from '@/components/side-panel';
import { useWide } from '@/hooks/use-wide';

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
  const wide = useWide();
  return <SafeAreaView style={[styles.screen, wide && styles.screenWide]}>
    <View style={[styles.frame, wide && styles.frameWide]}>
      <ScreenHeader title={title} back={back} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, wide && styles.contentWide]}>
        <View style={[styles.main, wide && styles.mainWide]}>
        <TextInput accessibilityLabel="토론 검색" placeholder="어떤 이야기가 궁금하세요?"
          placeholderTextColor={AppColors.textFaint} value={query} onChangeText={setQuery}
          maxLength={100} returnKeyType="search" style={styles.input} />
        <ResourceContent resource={resource} reload={reload}>{(categories) => <View style={styles.split}>
          <CategoryFilter value={categoryId} onChange={setCategoryId}
            options={[{ value: '', label: '전체' }, ...categories.map((item) => ({ value: item.id, label: item.name }))]} />
          <View style={styles.results}>
            <TextTabs value={status} onChange={setStatus} options={[{ value: 'OPEN', label: '문 연 토론' }, { value: 'CLOSED', label: '문 닫은 토론' }]} />
            <ApiResults key={JSON.stringify([search, categoryId, status])} categories={categories} search={search} categoryId={categoryId} status={status}
              onCategory={setCategoryId} />
          </View>
        </View>}</ResourceContent>
        </View>
        {wide && <PopularPanel />}
      </ScrollView>
    </View>
  </SafeAreaView>;
}

function ApiResults({ categories, search, categoryId, status, onCategory }: { categories: CategoryDto[]; search: string; categoryId: string; status: 'OPEN' | 'CLOSED'; onCategory: (id: string) => void }) {
  const sequence = useRef(0);
  const loader = useCallback(async () => {
    const number = ++sequence.current;
    const page = await getPublicDebates({ query: search, categoryId: categoryId || undefined, status });
    return { page, number };
  }, [search, categoryId, status]);
  const { resource, reload } = useFocusResource(loader);
  return <ResourceContent resource={resource} reload={reload}>{({ page, number }) =>
    // 재조회나 필터 변경 때 이전 페이지의 항목·cursor·오류를 함께 초기화합니다.
    <LoadedResults key={number} firstPage={page} categories={categories} query={{ query: search, categoryId: categoryId || undefined, status }} onCategory={onCategory} />
  }</ResourceContent>;
}

function LoadedResults({ firstPage, categories, query, onCategory }: { firstPage: PublicDebatesResponse; categories: CategoryDto[]; query: PublicDebatesQuery; onCategory: (id: string) => void }) {
  const [items, setItems] = useState(firstPage.data.debates);
  const [cursor, setCursor] = useState(firstPage.meta.nextCursor);
  const requested = useRef<string[]>([]);
  const mutation = useMutation();
  return <>
    {items.length === 0 && <EmptyResults categories={categories} query={query} />}
    {items.map((item) => <DiscussionCard key={item.id} discussion={toDiscussion(item, categories)}
      onCategoryPress={item.categoryId !== query.categoryId ? () => onCategory(item.categoryId) : undefined}
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

// 결과가 없을 때 이유를 말하고, 고른 주제로 바로 토론을 열 수 있게 잇는다.
function EmptyResults({ categories, query }: { categories: CategoryDto[]; query: PublicDebatesQuery }) {
  const category = categories.find((item) => item.id === query.categoryId)?.name;
  const closed = query.status === 'CLOSED';
  const message = query.query ? `'${query.query}'에 맞는 ${closed ? '문 닫은 ' : ''}토론이 없어요.`
    : category ? `${category} 주제는 아직 ${closed ? '문 닫은' : '문 연'} 토론이 없어요.`
    : `아직 ${closed ? '문 닫은' : '문 연'} 토론이 없어요.`;
  return <View style={styles.empty}>
    <ResourceState kind="empty" message={message} />
    {!closed && <AppButton variant="primary" label={category ? `${category} 주제로 토론 열기` : '토론 열기'}
      onPress={() => router.navigate({ pathname: '/discussions/create', params: category ? { category } : {} })} />}
  </View>;
}

const styles = StyleSheet.create({
  empty: { gap: AppSpacing.sm },
  screen: { flex: 1, backgroundColor: AppColors.surface },
  frame: { flex: 1, backgroundColor: AppColors.background, width: '100%', maxWidth: AppLayout.maxWidth, alignSelf: 'center', gap: AppSpacing.xs },
  content: { padding: AppSpacing.xl, gap: AppSpacing.lg },
  input: { ...AppTypography.body, color: AppColors.text, minHeight: 50, borderRadius: 25, paddingHorizontal: AppSpacing.xl, backgroundColor: AppColors.soft },
  // 왼쪽 카테고리 목록과 오른쪽 토론 목록으로 나눈다.
  // PC: 회색 바탕 위에 목록 패널과 오른쪽 '손님 많은 토론' 패널
  screenWide: { backgroundColor: AppColors.soft },
  frameWide: { maxWidth: WideLayout.maxWidth + 64, backgroundColor: 'transparent', paddingHorizontal: 32 },
  contentWide: { flexDirection: 'row', alignItems: 'flex-start', gap: WideLayout.gap, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 40 },
  mainWide: { ...PanelSurface, gap: AppSpacing.lg },
  main: { flex: 1, minWidth: 0, gap: AppSpacing.lg },
  split: { flexDirection: 'row', alignItems: 'flex-start', gap: AppSpacing.md },
  results: { flex: 1, minWidth: 0, gap: AppSpacing.lg },
  option: { flex: 1 },
});
