import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DiscussionCard } from '@/components/discussion-card';
import { ResourceState } from '@/components/resource-state';
import { ScreenHeader } from '@/components/screen-header';
import { AppButton } from '@/components/ui/app-button';
import { AppColors, AppLayout, AppSpacing, AppSurfaces, AppTypography } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { getHomeFeed } from '@/services/discussions';
import type { Discussion } from '@/types/discussion';

export default function HomeScreen() {
  const { resource, retry } = useResource(getHomeFeed);
  function openDiscussion(discussion: Discussion) {
    router.navigate({ pathname: '/discussions/[id]', params: { id: String(discussion.id) } });
  }
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.frame}>
        <ScreenHeader title="영업중" />
        <ScrollView contentContainerStyle={styles.content}>
          <AppButton label="관심 있는 주제를 검색해 보세요" onPress={() => router.navigate('/discussions')} />
          <Text accessibilityRole="header" style={styles.title}>지금, 생각이 모이는 곳</Text>
          {resource.status === 'loading' && <ResourceState kind="loading" />}
          {resource.status === 'error' && <ResourceState kind="error" onRetry={retry} />}
          {resource.status === 'success' && <>
            <Text accessibilityRole="header" style={styles.heading}>인기 토론</Text>
            {resource.data.popular.length === 0 ? <ResourceState kind="empty" /> :
              resource.data.popular.map((item) => <DiscussionCard key={item.id} discussion={item} onPress={() => openDiscussion(item)} />)}
            <Pressable accessibilityRole="button" onPress={() => router.navigate('/discussions')}
              style={({ pressed }) => [styles.menu, pressed && styles.pressed]}>
              <Text style={styles.menuTitle}>인기 토론 더보기  ›</Text>
              <Text style={styles.caption}>최근 24시간 신규 참여자 기준</Text>
            </Pressable>
            <Text accessibilityRole="header" style={styles.heading}>맞춤 추천 토론</Text>
            {resource.data.recommended.length === 0 ? <ResourceState kind="empty" /> :
              resource.data.recommended.map((item) => <DiscussionCard key={item.id} discussion={item} recommended onPress={() => openDiscussion(item)} />)}
          </>}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface },
  frame: { flex: 1, backgroundColor: AppColors.background, width: '100%', maxWidth: AppLayout.maxWidth, alignSelf: 'center', gap: AppSpacing.xs },
  content: { padding: AppSpacing.xl, gap: AppSpacing.lg },
  title: { ...AppTypography.title, color: AppColors.text },
  heading: { ...AppTypography.heading, color: AppColors.text },
  menu: { ...AppSurfaces.card },
  menuTitle: { ...AppTypography.label, color: AppColors.text },
  caption: { ...AppTypography.caption, color: AppColors.textSecondary },
  pressed: { opacity: 0.65 },
});
