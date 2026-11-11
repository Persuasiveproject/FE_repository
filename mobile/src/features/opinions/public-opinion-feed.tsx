import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ResourceContent } from '@/components/resource-content';
import { AppButton } from '@/components/ui/app-button';
import { Caption, ErrorNotice, Notice, Row } from '@/components/ui/content-blocks';
import { AppColors, AppSpacing } from '@/constants/theme';
import { ChoiceGroup } from '@/features/core/choice-group';
import { STANCES, STANCE_LABEL } from '@/features/core/rules';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { useMutation } from '@/hooks/use-mutation';
import { appendPostPage, getPublicPosts, getPublicThread, toOpinionCard } from '@/services/public-debate-api';
import type { PublicPostPage, PublicPostQuery } from '@/types/api';
import type { Membership, Stance } from '@/types/core';
import { OpinionCard } from './opinion-card';
import { useSession } from '@/features/session/session-provider';

type Props = { debateId: string; parentId?: string; compact?: boolean; membership?: Membership | null; closed?: boolean };

export function PublicOpinionFeed({ debateId, parentId, compact = false, membership, closed }: Props) {
  const [stance, setStance] = useState<Stance | 'ALL'>('ALL');
  const [sort, setSort] = useState<'latest' | 'upvotes'>('latest');
  return <View style={compact ? styles.replies : styles.feed}>
    {!compact && <ChoiceGroup options={[{ value: 'ALL', label: '전체' }, ...STANCES.map((value) => ({ value, label: STANCE_LABEL[value] }))]}
      value={stance} onChange={setStance} layout="row" />}
    {parentId === undefined && <Row>
      <AppButton label="AI 요약" onPress={() => router.navigate({ pathname: '/discussions/[id]/summary', params: { id: debateId } })} />
      <AppButton label={sort === 'latest' ? '정렬 · 최신순' : '정렬 · 추천순'} onPress={() => setSort(sort === 'latest' ? 'upvotes' : 'latest')} />
    </Row>}
    <PostPages key={JSON.stringify([debateId, parentId, stance, sort])} debateId={debateId} parentId={parentId}
      stance={stance} sort={sort} membership={membership} closed={closed} />
    {!!parentId && membership && !closed && <AppButton label="이 의견에 답글 쓰기" onPress={() => router.navigate({ pathname: '/discussions/[id]/reply/[opinionId]', params: { id: debateId, opinionId: parentId! } })} />}
    {compact && <AppButton label="답글 전체 화면 보기" onPress={() => router.navigate({ pathname: '/discussions/[id]/threads/[opinionId]', params: { id: debateId, opinionId: parentId! } })} />}
  </View>;
}

type PageProps = Props & { stance: Stance | 'ALL'; sort: 'latest' | 'upvotes' };
function PostPages({ debateId, parentId, stance, sort, membership, closed }: PageProps) {
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
    <LoadedPosts key={number} debateId={debateId} parentId={parentId} stance={stance} sort={sort} firstPage={page} membership={membership} closed={closed} />
  }</ResourceContent>;
}

function LoadedPosts({ debateId, parentId, stance, sort, firstPage, membership, closed }: PageProps & { firstPage: PublicPostPage }) {
  const { profile } = useSession();
  const [items, setItems] = useState(firstPage.items);
  const [cursor, setCursor] = useState(firstPage.nextCursor);
  const [expanded, setExpanded] = useState<string[]>([]);
  const requested = useRef<string[]>([]);
  const mutation = useMutation();
  // 답글 API에는 stance 필터가 없습니다. 내려받은 답글에만 화면 필터를 적용합니다.
  const visible = parentId === undefined || stance === 'ALL' ? items : items.filter((item) => item.stanceAtWrite === stance);
  return <>
    {parentId !== undefined && <Caption>불러온 답글 {items.length}개{stance !== 'ALL' ? ' · 입장 필터는 불러온 답글에 적용됩니다.' : ''}</Caption>}
    {visible.length === 0 && <Notice>{cursor !== null ? '불러온 목록에 해당 의견이 없습니다. 더 보기를 눌러 다음 목록을 확인해 주세요.' : '아직 해당 의견이나 답글이 없습니다.'}</Notice>}
    {visible.map((item) => <View key={item.postId} style={styles.item}>
      <OpinionCard item={toOpinionCard(item)} canVote={false} onVote={() => {}}
        canPersuade={!!profile && !!membership && !closed && membership.anonymousNo !== item.anonymousNo}
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
  item: { gap: AppSpacing.sm },
  replies: { gap: AppSpacing.sm, paddingLeft: AppSpacing.sm, borderLeftWidth: 2, borderLeftColor: AppColors.border },
});
