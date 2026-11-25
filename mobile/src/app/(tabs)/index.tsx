import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '@/features/session/session-provider';
import { withAuthRevision } from '@/services/basic-auth';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DiscussionCard } from '@/components/discussion-card';
import { ResourceState } from '@/components/resource-state';
import { ScreenHeader } from '@/components/screen-header';
import { Icon } from '@/components/ui/icon';
import { AnonAvatar, StatusSign, displayName } from '@/components/ui/stance';
import { CompactDebateList, CreatePanel, SidePanel } from '@/components/side-panel';
import { QuickDebateList, QuickPanel } from '@/features/discussions/quick-debates';
import { AppColors, AppLayout, AppRadius, AppSpacing, AppSurfaces, AppTypography, PanelSurface, StanceColors, WideLayout } from '@/constants/theme';
import { useWide } from '@/hooks/use-wide';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { getHomeFeed, getQuickDebates } from '@/services/discussions';
import { dataSource, gateway } from '@/services/gateway';
import { getPublicPosts } from '@/services/public-debate-api';
import type { Stance } from '@/types/core';
import type { Discussion } from '@/types/discussion';
import { timeLeft } from '@/features/core/rules';

type Quote = { stance: Stance; content: string; authorName: string; anonymousNo?: number };

function openDiscussion(discussion: Discussion) {
  router.navigate({ pathname: '/discussions/[id]', params: { id: String(discussion.id) } });
}

// 대표 토론의 찬성·반대 쪽에서 공감을 가장 많이 받은 의견을 하나씩 가져온다. 실패해도 홈은 그대로 보인다.
async function loadQuotes(id: string): Promise<Quote[]> {
  const sides: Stance[] = ['PRO', 'CON'];
  if (dataSource === 'api') {
    const pages = await Promise.all(sides.map((stance) => getPublicPosts(id, { sort: 'upvotes', stance }).catch(() => null)));
    return pages.flatMap((page, i) => {
      const top = page?.items[0];
      return top ? [{ stance: sides[i], content: top.content, authorName: `익명 ${top.anonymousNo}`, anonymousNo: top.anonymousNo }] : [];
    });
  }
  const opinions = await gateway.listOpinions(id).catch(() => []);
  return sides.flatMap((stance) => {
    const top = opinions.filter((o) => o.stance === stance).sort((a, b) => b.upvotes - a.upvotes)[0];
    return top ? [{ stance, content: top.content, authorName: top.authorName, anonymousNo: top.anonymousNo }] : [];
  });
}

const CAROUSEL_MAX = 5;
const CAROUSEL_GAP = 12;
const EDGE = AppSpacing.xl;

// 휴대폰 홈 첫 화면: 손님 많은 끝장토론을 옆으로 넘겨 본다.
// 다음 카드가 오른쪽에 걸쳐 보여 넘길 수 있다는 걸 알리고, 아래 점으로 위치를 보여 준다. 자동으로 넘어가지 않는다.
// 마지막 카드까지 4번 안에 닿도록 5개까지만 둔다(NN/g: 3~4번 안에 마지막 항목).
function FeaturedCarousel({ items }: { items: Discussion[] }) {
  const ref = useRef<ScrollViewInstance>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const card = Math.max(0, width - EDGE * 3);
  const step = card + CAROUSEL_GAP;
  const go = (i: number) => { ref.current?.scrollTo({ x: i * step, animated: true }); setIndex(i); };
  return <View style={styles.carousel} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
    {width > 0 && <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false}
      snapToInterval={step} snapToAlignment="start" decelerationRate="fast" disableIntervalMomentum
      scrollEventThrottle={32} accessibilityLabel="손님 많은 토론, 옆으로 넘겨 보기"
      onScroll={(e) => {
        const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
        const atEnd = contentOffset.x + layoutMeasurement.width >= contentSize.width - 4;
        setIndex(atEnd ? items.length - 1 : Math.min(items.length - 1, Math.max(0, Math.round(contentOffset.x / step))));
      }}
      style={Platform.OS === 'web' ? styles.snapWeb : undefined}
      contentContainerStyle={styles.carouselTrack}>
      {items.map((item, i) => <View key={item.id} style={[{ width: card }, Platform.OS === 'web' && styles.snapItem]}
        accessibilityLabel={`${items.length}개 중 ${i + 1}번째`}>
        <FeaturedDebate discussion={item} fill />
      </View>)}
    </ScrollView>}
    {items.length > 1 && <View style={styles.dots}>
      {items.map((item, i) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${i + 1}번째 토론 보기`}
        accessibilityState={{ selected: i === index }} hitSlop={8} onPress={() => go(i)}
        style={[styles.dot, i === index && styles.dotActive]} />)}
    </View>}
  </View>;
}

function FeaturedDebate({ discussion, flat = false, fill = false }: { discussion: Discussion; flat?: boolean; fill?: boolean }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  useEffect(() => {
    let alive = true;
    void loadQuotes(String(discussion.id)).then((items) => { if (alive) setQuotes(items); });
    return () => { alive = false; };
  }, [discussion.id]);
  return <Pressable accessibilityRole="button" accessibilityLabel={discussion.title} onPress={() => openDiscussion(discussion)}
    style={({ pressed }) => [styles.featured, flat && styles.featuredFlat, fill && styles.featuredFill, pressed && styles.pressed]}>
    <StatusSign closed={discussion.status === 'CLOSED'} category={discussion.category} extra={[`손님 ${discussion.participants}명`, timeLeft(discussion.endsAt)]} />
    <Text style={styles.featuredTitle}>{discussion.title}</Text>
    {quotes.length === 0 && !!discussion.description && <Text numberOfLines={3} style={styles.featuredBody}>{discussion.description}</Text>}
    {quotes.map((quote) => {
      const right = quote.stance === 'CON';
      return <View key={quote.stance} style={[styles.quoteRow, right && styles.quoteRowRight]}>
        <AnonAvatar authorName={quote.authorName} anonymousNo={quote.anonymousNo} size={28} />
        <View style={[styles.quoteCol, right && styles.quoteColRight]}>
          <Text style={[styles.quoteLabel, { color: StanceColors[quote.stance].text }]}>
            {quote.stance === 'PRO' ? '찬성' : '반대'}  {displayName(quote.authorName, quote.anonymousNo)}
          </Text>
          <View style={[styles.bubble, { backgroundColor: StanceColors[quote.stance].tint }, right ? styles.bubbleRight : styles.bubbleLeft]}>
            <Text numberOfLines={3} style={styles.quoteText}>{quote.content}</Text>
          </View>
        </View>
      </View>;
    })}
    {fill && <View style={styles.spacer} />}
    <View style={styles.more}><Text style={styles.moreText}>대화 보러 가기</Text><Icon name="right" size={16} strokeWidth={2} /></View>
  </Pressable>;
}

export default function HomeScreen() {
  const { revision } = useSession();
  const loader = useCallback(() => withAuthRevision(revision, async () => {
    // 간단토론 목록을 못 불러와도 끝장토론 홈은 보이게 한다.
    const [feed, quick] = await Promise.all([getHomeFeed(), getQuickDebates().catch(() => [] as Discussion[])]);
    const endless = (items: Discussion[]) => items.filter((item) => item.kind !== '간단토론');
    const popular = endless(feed.popular);
    const seen = new Set(popular.map((item) => String(item.id)));
    return { popular, recommended: endless(feed.recommended).filter((item) => !seen.has(String(item.id))), quick };
  }), [revision]);
  const { resource, reload: retry } = useFocusResource(loader);
  // 간단토론은 2개까지만 보이고 나머지는 펼쳐서 본다.
  const [showAllQuick, setShowAllQuick] = useState(false);
  // PC(가로 태블릿 포함): 회색 바탕 위에 패널 여러 개. 휴대폰은 한 열 화면.
  const wide = useWide();
  const search = <Pressable accessibilityRole="button" accessibilityLabel="토론 검색" hitSlop={8}
    onPress={() => router.navigate('/discussions')} style={styles.iconButton}><Icon name="search" /></Pressable>;
  const states = <>
    {resource.status === 'loading' && <ResourceState kind="loading" />}
    {resource.status === 'error' && <ResourceState kind="error" message={resource.error.message} onRetry={retry} />}
  </>;
  const emptyState = <View style={styles.empty}>
    <Text style={styles.emptyTitle}>아직 문 연 끝장토론이 없어요</Text>
    <Pressable accessibilityRole="button" onPress={() => router.navigate('/discussions/create')} style={styles.emptyButton}>
      <Text style={styles.emptyButtonText}>토론 열기</Text>
    </Pressable>
  </View>;
  const allLink = <Pressable accessibilityRole="button" onPress={() => router.navigate('/discussions')} hitSlop={6}>
    <Text style={styles.link}>전체보기</Text>
  </Pressable>;
  const data = resource.status === 'success' ? resource.data : null;
  const [first, ...rest] = data?.popular ?? [];

  if (wide) {
    return <SafeAreaView style={styles.wideSafe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.canvas}>
        <View style={styles.wideInner}>
          <ScreenHeader title="홈" right={search} />
          <View style={styles.columns}>
            <View style={styles.wideMain}>
              <Text accessibilityRole="header" style={styles.wideTitle}>끝장토론</Text>
              {!data && <View style={styles.panel}>{states}</View>}
              {data && !first && <View style={styles.panel}>{emptyState}</View>}
              {first && <FeaturedDebate flat discussion={first} />}
              {rest.length > 0 && <View style={styles.panel}>
                <View style={styles.sectionHead}>
                  <Text accessibilityRole="header" style={styles.heading}>손님 많은 토론</Text>{allLink}
                </View>
                {rest.map((item) => <DiscussionCard key={item.id} discussion={item} onPress={() => openDiscussion(item)} />)}
              </View>}
            </View>
            <View style={styles.aside}>
              <SidePanel title="맞춤 추천">
                {data ? <CompactDebateList items={data.recommended} empty="아직 추천할 토론이 없어요." />
                  : <Text style={styles.link}>{resource.status === 'error' ? '불러오지 못했어요.' : '불러오는 중이에요.'}</Text>}
              </SidePanel>
              {!!data?.quick.length && <QuickPanel items={data.quick} />}
              <CreatePanel />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.frame}>
        <ScreenHeader title="영업중" brand right={search} />
        <ScrollView contentContainerStyle={styles.content}>
          {states}
          {data && <>
            {/* 홈의 중심은 끝장토론: 손님 많은 토론을 옆으로 넘겨 보고, 바로 아래에 간단토론(있을 때)과 관심 주제 추천을 둔다. */}
            {!first && emptyState}
            {first && <>
              <View style={styles.sectionHeadTop}>
                <Text accessibilityRole="header" style={styles.heading}>손님 많은 토론</Text>{allLink}
              </View>
              <FeaturedCarousel items={data.popular.slice(0, CAROUSEL_MAX)} />
            </>}
            {data.quick.length > 0 && <View style={styles.quickStrip}>
              <View style={styles.blockHead}>
                <Text accessibilityRole="header" style={styles.heading}>지금 열린 간단토론</Text>
              </View>
              <QuickDebateList items={showAllQuick ? data.quick : data.quick.slice(0, 2)} empty="compact" />
              {data.quick.length > 2 && <Pressable accessibilityRole="button" onPress={() => setShowAllQuick((v) => !v)} style={styles.quickMore}>
                <Text style={styles.quickMoreText}>{showAllQuick ? '접기' : `간단토론 ${data.quick.length - 2}개 더 보기`}</Text>
              </Pressable>}
            </View>}
            {data.recommended.length > 0 && <View style={styles.sectionHead}>
              <Text accessibilityRole="header" style={styles.heading}>관심 주제에서 고른 토론</Text>
            </View>}
            {data.recommended.map((item) => <DiscussionCard key={item.id} discussion={item} recommended onPress={() => openDiscussion(item)} />)}
            {data.popular.length > CAROUSEL_MAX && <>
              <View style={styles.sectionHead}>
                <Text accessibilityRole="header" style={styles.heading}>더 많은 끝장토론</Text>{allLink}
              </View>
              {data.popular.slice(CAROUSEL_MAX, CAROUSEL_MAX + 5).map((item) => <DiscussionCard key={item.id} discussion={item} onPress={() => openDiscussion(item)} />)}
            </>}
          </>}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface },
  frame: { flex: 1, backgroundColor: AppColors.background, width: '100%', maxWidth: AppLayout.maxWidth, alignSelf: 'center' },
  content: { paddingHorizontal: AppSpacing.xl, paddingTop: AppSpacing.md, paddingBottom: AppSpacing.xl * 2, gap: AppSpacing.lg },
  iconButton: { minWidth: AppLayout.touchTarget, minHeight: AppLayout.touchTarget, alignItems: 'center', justifyContent: 'center' },
  featured: { ...AppSurfaces.card, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 20, gap: 14 },
  featuredFlat: { borderWidth: 0, borderRadius: 20, paddingHorizontal: 28, paddingVertical: 26 },
  featuredFill: { flex: 1 },
  spacer: { flex: 1 },
  carousel: { marginHorizontal: -EDGE, gap: AppSpacing.md },
  carouselTrack: { paddingHorizontal: EDGE, gap: CAROUSEL_GAP },
  // 웹: 브라우저의 스크롤 스냅으로 카드 단위로 멈추게 한다(앱은 snapToInterval).
  snapWeb: { scrollSnapType: 'x mandatory', scrollPaddingLeft: EDGE } as object,
  snapItem: { scrollSnapAlign: 'start' } as object,
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: AppColors.border },
  dotActive: { width: 18, backgroundColor: AppColors.text },
  sectionHeadTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wideSafe: { flex: 1, backgroundColor: AppColors.soft },
  canvas: { paddingHorizontal: 32, paddingBottom: 40, alignItems: 'center' },
  wideInner: { width: '100%', maxWidth: WideLayout.maxWidth, gap: 8 },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: WideLayout.gap },
  wideMain: { flex: 1, minWidth: 0, gap: WideLayout.gap },
  aside: { width: WideLayout.panelWidth, gap: WideLayout.gap },
  panel: { ...PanelSurface, gap: 0 },
  wideTitle: { ...AppTypography.title, fontSize: 24, color: AppColors.text, paddingTop: 4 },
  quickStrip: { ...AppSurfaces.card, gap: AppSpacing.xs, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 4, borderRadius: 24 },
  blockHead: { flexDirection: 'row', alignItems: 'baseline', gap: AppSpacing.sm },
  quickMore: { alignSelf: 'flex-start', paddingVertical: 6, minHeight: AppLayout.touchTarget, justifyContent: 'center' },
  quickMoreText: { ...AppTypography.caption, fontSize: 14, fontWeight: '600', color: AppColors.text },

  featuredTitle: { ...AppTypography.title, fontSize: 22, lineHeight: 30, color: AppColors.text },
  featuredBody: { ...AppTypography.body, color: AppColors.textSecondary },
  quoteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: AppSpacing.sm },
  quoteRowRight: { flexDirection: 'row-reverse' },
  quoteCol: { flex: 1, gap: 5, alignItems: 'flex-start' },
  quoteColRight: { alignItems: 'flex-end' },
  quoteLabel: { ...AppTypography.caption, fontWeight: '700' },
  bubble: { borderRadius: AppRadius.bubble, paddingHorizontal: 14, paddingVertical: 11, maxWidth: '92%' },
  bubbleLeft: { borderTopLeftRadius: 4 },
  bubbleRight: { borderTopRightRadius: 4 },
  quoteText: { ...AppTypography.body, fontWeight: '500', color: AppColors.text },
  more: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  moreText: { ...AppTypography.label, fontSize: 14, color: AppColors.text },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: AppSpacing.md },
  heading: { ...AppTypography.heading, fontSize: 19, color: AppColors.text },
  link: { ...AppTypography.caption, fontSize: 14, fontWeight: '500', color: AppColors.textSecondary },
  empty: { paddingVertical: AppSpacing.xl * 2, alignItems: 'center', gap: AppSpacing.sm },
  emptyTitle: { ...AppTypography.heading, color: AppColors.text },
  emptyBody: { ...AppTypography.body, color: AppColors.textSecondary },
  emptyButton: { marginTop: AppSpacing.sm, paddingHorizontal: AppSpacing.xl, minHeight: 48, borderRadius: 999,
    backgroundColor: AppColors.primary, alignItems: 'center', justifyContent: 'center' },
  emptyButtonText: { ...AppTypography.label, color: AppColors.surface },
  pressed: { opacity: 0.6 },
});
