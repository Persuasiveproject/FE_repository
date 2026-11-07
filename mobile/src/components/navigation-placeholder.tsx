import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppColors } from '@/constants/theme';

// 상세/생성 화면에서 함께 사용하는 임시 화면입니다.
export function NavigationPlaceholder({ title, description }: { title: string; description?: string }) {
  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      // 웹에서 주소를 직접 열었을 때도 홈으로 돌아갈 수 있습니다.
      router.replace('/');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Pressable accessibilityRole="button" onPress={goBack} style={styles.backButton}>
        <Text style={styles.backText}>뒤로 가기</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: AppColors.background },
  backButton: { alignSelf: 'flex-start', paddingVertical: 12, paddingHorizontal: 8 },
  backText: { color: AppColors.primary, fontSize: 16 },
  title: { marginTop: 20, fontSize: 24, fontWeight: '700', color: AppColors.text },
  description: { marginTop: 16, fontSize: 15, color: AppColors.textSecondary },
});
