import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ResourceContent } from '@/components/resource-content';
import { AppButton } from '@/components/ui/app-button';
import { Caption, ErrorNotice, Notice } from '@/components/ui/content-blocks';
import { Icon } from '@/components/ui/icon';
import { TextTabs } from '@/components/ui/text-tabs';
import { AppColors, AppSpacing, AppTypography } from '@/constants/theme';
import { STANCES, STANCE_LABEL } from '@/features/core/rules';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { useMutation } from '@/hooks/use-mutation';
import { appendPostPage, getPublicPosts, getPublicThread } from '@/services/public-debate-api';
import { opinionReactionsEnabled } from '@/services/opinion-reaction-api';
import type { PublicPostPage, PublicPostQuery } from '@/types/api';
import type { Membership, Stance } from '@/types/core';
import { ApiOpinionCard } from './api-opinion-card';

type Props = { debateId: string; parentId?: string; compact?: boolean; membership?: Membership | null; closed?: boolean };

export function PublicOpinionFeed({ debateId, parentId, compact = false, membership, closed }: Props) {
  const [stance, setStance] = useState<Stance | 'ALL'>('ALL');
  const [sort, setSort] = useState<'latest' | 'upvotes' | 'persuasion'>('latest');
  const useUpvotesForSmallDebate = useCallback(() => setSort('upvotes'), []);
  return <View style={compact ? styles.replies : styles.feed}>
    {!compact && <Caption>{opinionReactionsEnabled()
      ? '선택한 반응을 다시 누르면 취소합니다. 이전 접속의 반응은 조회되지 않으므로 내 반응 취소를 사용할 수 있어요.'
      : '공감·비공감 기능은 서버 연결 준비 중입니다.'}</Caption>}
    {parentId === undefined && <AiSummaryEntry debateId={debateId} />}
    {!compact && <FeedFilterBar stance={stance} onStance={setStance}
      sorts={parentId === undefined ? SORTS : undefined} sort={sort} onSort={setSort} />}
    <PostPages key={JSON.stringify([debateId, parentId, stance, sort])} debateId={debateId} parentId={parentId}
      stance={stance} sort={sort} membership={membership} closed={closed} onSmallPersuasionResult={useUpvotesForSmallDebate} />
    {!!parentId && membership && !closed && <AppButton label="이 의견에 답글 쓰기" onPress={() => router.navigate({ pathname: '/discussions/[id]/reply/[opinionId]', params: { id: debateId, opinionId: parentId! } })} />}
    {compact && <AppButton label="답글 전체 화면 보기" onPress={() => router.navigate({ pathname: '/discussions/[id]/threads/[opinionId]', params: { id: debateId, opinionId: parentId! } })} />}
  </View>;
}

const SORTS = [{ value: 'latest' as const, label: '최신순' }, { value: 'upvotes' as const, label: '공감순' }, { value: 'persuasion' as const, label: '영업순' }];

// B안 토론 화면의 AI 요약 진입 줄과 입장·정렬 글자 탭. 데모 화면(detail-screen)도 같은 모양을 쓴다.
export function AiSummaryEntry({ debateId }: { debateId: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="AI 요약"
    onPress={() => router.navigate({ pathname: '/discussions/[id]/summary', params: { id: debateId } })}
    style={({ pressed }) => [styles.aiEntry, pressed && styles.pressed]}>
    <Icon name="spark" size={20} strokeWidth={1.6} />
    <Text style={styles.aiText}>AI가 양쪽 핵심 근거를 정리했어요</Text>
    <Icon name="right" size={18} color={AppColors.textFaint} />
  </Pressable>;
}

type FilterProps<S extends string> = {
  stance: Stance | 'ALL'; onStance: (value: Stance | 'ALL') => void;
  sorts?: { value: S; label: string }[]; sort?: S; onSort?: (value: S) => void;
};
export function FeedFilterBar<S extends string>({ stance, onStance, sorts, sort, onSort }: FilterProps<S>) {
  return <View style={styles.feedHead}>
    <TextTabs options={[{ value: 'ALL' as const, label: '전체' }, ...STANCES.map((value) => ({ value, label: STANCE_LABEL[value] }))]}
      value={stance} onChange={onStance} />
    {!!sorts && sort !== undefined && onSort && <View style={styles.sortRow}>
      {sorts.map((option) => {
        const active = option.value === sort;
        return <Pressable key={option.value} accessibilityRole="button" accessibilityLabel={`정렬 · ${option.label}`}
          accessibilityState={{ selected: active }} onPress={() => onSort(option.value)} hitSlop={6}
          style={({ pressed }) => pressed && styles.pressed}>
          <Text style={[styles.sortText, active && styles.sortActive]}>{option.label}</Text>
        </Pressable>;
      })}
    </View>}
  </View>;
}

type PageProps = Props & { stance: Stance | 'ALL'; sort: 'latest' | 'upvotes' | 'persuasion'; onSmallPersuasionResult?: () => void };
function PostPages({ debateId, parentId, stance, sort, membership, closed, onSmallPersuasionResult }: PageProps) {
  const sequence = useRef(0);
  const loader = useCallback(async () => {
    const number = ++sequence.current;
    const page = parentId === undefined
      ? await getPublicPosts(debateId, { sort, stance: stance === 'ALL' ? undefined : stance })
      : await getPublicThread(debateId, parentId);
    return { page, number };
  }, [debateId, parentId, stance, sort]);
  const { resource, reload } = useFocusResource(loader);
  return <ResourceContent resource={resource} reload={reload}>{({ page, number }) =>
    <LoadedPosts key={number} debateId={debateId} parentId={parentId} stance={stance} sort={sort} firstPage={page} membership={membership} closed={closed} onSmallPersuasionResult={onSmallPersuasionResult} />
  }</ResourceContent>;
}

function LoadedPosts({ debateId, parentId, stance, sort, firstPage, membership, closed, onSmallPersuasionResult }: PageProps & { firstPage: PublicPostPage }) {
  const [items, setItems] = useState(firstPage.items);
  const [cursor, setCursor] = useState(firstPage.nextCursor);
  const [expanded, setExpanded] = useState<string[]>([]);
  const requested = useRef<string[]>([]);
  const mutation = useMutation();
  useEffect(() => {
    // 서버의 영업순 목록을 모두 불러온 결과가 20개 미만이면 공감순으로 대체합니다.
    if (parentId === undefined && sort === 'persuasion' && cursor === null && items.length < 20) onSmallPersuasionResult?.();
  }, [cursor, items.length, onSmallPersuasionResult, parentId, sort]);
  // 답글 API에는 stance 필터가 없습니다. 내려받은 답글에만 화면 필터를 적용합니다.
  const visible = parentId === undefined || stance === 'ALL' ? items : items.filter((item) => item.stanceAtWrite === stance);
  return <>
    {parentId !== undefined && <Caption>불러온 답글 {items.length}개{stance !== 'ALL' ? ' · 입장 필터는 불러온 답글에 적용됩니다.' : ''}</Caption>}
    {visible.length === 0 && <Notice>{cursor !== null ? '불러온 목록에 해당 의견이 없습니다. 더 보기를 눌러 다음 목록을 확인해 주세요.' : '아직 해당 의견이나 답글이 없습니다.'}</Notice>}
    {visible.map((item) => <View key={item.postId} style={styles.item}>
      <ApiOpinionCard post={item} membership={membership} closed={closed}
        onPersuaded={() => router.navigate({ pathname: '/discussions/[id]/vote', params: { id: debateId, opinionId: item.postId } })}
        repliesExpanded={parentId === undefined && expanded.includes(item.postId)}
        onOpen={() => {
          if (parentId !== undefined) router.navigate({ pathname: '/discussions/[id]/threads/[opinionId]', params: { id: debateId, opinionId: item.postId } });
          else setExpanded((current) => current.includes(item.postId) ? current.filter((value) => value !== item.postId) : [...current, item.postId]);
        }} />
      {parentId === undefined && expanded.includes(item.postId) && <PublicOpinionFeed debateId={debateId} parentId={item.postId} compact membership={membership} closed={closed} />}
    </View>)}
    <ErrorNotice message={mutation.error} />
    {cursor !== null && <AppButton label={mutation.error ? '다음 목록 다시 시도' : parentId === undefined ? '의견 더 보기' : '답글 더 보기'} loading={mutation.pending}
      onPress={() => {
        const next = cursor;
        void mutation.run(async () => {
          const query: PublicPostQuery = { sort, stance: stance === 'ALL' ? undefined : stance, cursor: next };
          const page = parentId === undefined ? await getPublicPosts(debateId, query) : await getPublicThread(debateId, parentId, next);
          return { page, combined: appendPostPage(items, page, [...requested.current, next]) };
        }, ({ page, combined }) => { requested.current.push(next); setItems(combined); setCursor(page.nextCursor); });
      }} />}
  </>;
}
const styles = StyleSheet.create({
  feed: { gap: AppSpacing.lg },
  aiEntry: { flexDirection: 'row', alignItems: 'center', gap: AppSpacing.sm + 2, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14, backgroundColor: AppColors.soft },
  aiText: { ...AppTypography.label, fontSize: 14, fontWeight: '500', color: AppColors.text, flex: 1 },
  feedHead: { gap: AppSpacing.sm, paddingTop: AppSpacing.sm },
  sortRow: { flexDirection: 'row', gap: AppSpacing.md },
  sortText: { ...AppTypography.caption, fontWeight: '500', color: AppColors.textFaint },
  sortActive: { color: AppColors.text, fontWeight: '700' },
  pressed: { opacity: 0.6 },
  item: { gap: AppSpacing.md },
  replies: { gap: AppSpacing.md, paddingLeft: 40 },
});
