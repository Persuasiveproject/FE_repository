import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/features/session/session-provider';
import { withAuthRevision } from '@/services/basic-auth';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DiscussionCard } from '@/components/discussion-card';
import { ResourceState } from '@/components/resource-state';
import { ScreenHeader } from '@/components/screen-header';
import { Icon } from '@/components/ui/icon';
import { AnonAvatar, StatusSign, displayName } from '@/components/ui/stance';
import { TextTabs } from '@/components/ui/text-tabs';
import { AppColors, AppLayout, AppRadius, AppSpacing, AppSurfaces, AppTypography, StanceColors } from '@/constants/theme';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { getHomeFeed } from '@/services/discussions';
import { dataSource, gateway } from '@/services/gateway';
import { getPublicPosts } from '@/services/public-debate-api';
import type { Stance } from '@/types/core';
import type { Discussion } from '@/types/discussion';

type Feed = 'popular' | 'recommended';
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

function FeaturedDebate({ discussion }: { discussion: Discussion }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  useEffect(() => {
    let alive = true;
    void loadQuotes(String(discussion.id)).then((items) => { if (alive) setQuotes(items); });
    return () => { alive = false; };
  }, [discussion.id]);
  return <Pressable accessibilityRole="button" accessibilityLabel={discussion.title} onPress={() => openDiscussion(discussion)}
    style={({ pressed }) => [styles.featured, pressed && styles.pressed]}>
    <StatusSign closed={discussion.status === 'CLOSED'} extra={[discussion.category, `손님 ${discussion.participants}명`]} />
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
    <View style={styles.more}><Text style={styles.moreText}>대화 보러 가기</Text><Icon name="right" size={16} strokeWidth={2} /></View>
  </Pressable>;
}

export default function HomeScreen() {
  const { revision } = useSession();
  const loader = useCallback(() => withAuthRevision(revision, getHomeFeed), [revision]);
  const { resource, reload: retry } = useFocusResource(loader);
  const [feed, setFeed] = useState<Feed>('popular');
  const search = <Pressable accessibilityRole="button" accessibilityLabel="토론 검색" hitSlop={8}
    onPress={() => router.navigate('/discussions')} style={styles.iconButton}><Icon name="search" /></Pressable>;
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.frame}>
        <ScreenHeader title="영업중" brand right={search} />
        <ScrollView contentContainerStyle={styles.content}>
          <TextTabs size="large" value={feed} onChange={setFeed}
            options={[{ value: 'popular', label: '손님 많은' }, { value: 'recommended', label: '맞춤 추천' }]} />
          {resource.status === 'loading' && <ResourceState kind="loading" />}
          {resource.status === 'error' && <ResourceState kind="error" message={resource.error.message} onRetry={retry} />}
          {resource.status === 'success' && (() => {
            const items = feed === 'popular' ? resource.data.popular : resource.data.recommended;
            if (items.length === 0) return <View style={styles.empty}>
              <Text style={styles.emptyTitle}>아직 문 연 토론이 없어요</Text>
              <Text style={styles.emptyBody}>첫 토론을 열고 손님을 맞아 보세요.</Text>
              <Pressable accessibilityRole="button" onPress={() => router.navigate('/discussions/create')} style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>토론 열기</Text>
              </Pressable>
            </View>;
            const [first, ...rest] = items;
            return <>
              <FeaturedDebate discussion={first} />
              {rest.length > 0 && <View style={styles.sectionHead}>
                <Text accessibilityRole="header" style={styles.heading}>{feed === 'popular' ? '지금 손님 많은 토론' : '관심 주제에서 고른 토론'}</Text>
                <Pressable accessibilityRole="button" onPress={() => router.navigate('/discussions')} hitSlop={6}>
                  <Text style={styles.link}>전체보기</Text>
                </Pressable>
              </View>}
              {rest.map((item) => <DiscussionCard key={item.id} discussion={item} recommended={feed === 'recommended'} onPress={() => openDiscussion(item)} />)}
            </>;
          })()}
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
