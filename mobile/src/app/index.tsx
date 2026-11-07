import { AppColors } from '@/constants/theme';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DiscussionCard } from '@/components/discussion-card';

// 1. 카테고리 목록
const categories = ['전체', '사회', '기술', '문화', '경제'];

// 2. 연습용 토론 데이터 (아직 서버와 연결하지 않음)
const discussions = [
  {
    id: 1,
    category: '기술',
    title: 'AI는 인간의 일자리를 대체할까?',
    description: 'AI 발전이 고용시장에 미치는 영향',
    participants: 128,
  },
  {
    id: 2,
    category: '사회',
    title: '주 4일 근무제, 도입해야 할까?',
    description: '생산성과 삶의 질, 무엇이 중요할까?',
    participants: 86,
  },
  {
    id: 3,
    category: '문화',
    title: '영화관보다 OTT가 더 좋을까?',
    description: '콘텐츠 감상 방식의 변화',
    participants: 54,
  },
];

// 3. 홈 화면 컴포넌트
export default function HomeScreen() {
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [notice, setNotice] = useState('');

  // 선택한 카테고리에 해당하는 토론만 표시
  const filteredDiscussions = discussions.filter(
    (item) =>
      selectedCategory === '전체' ||
      item.category === selectedCategory
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* 상단 영역 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>영업중</Text>
            <Text style={styles.subtitle}>
              서로 다른 생각이 만나는 곳
            </Text>
          </View>

          <Pressable
            style={styles.createButton}
            onPress={() => setNotice('토론 만들기 화면은 다음에 구현합니다.')}>
            <Text style={styles.createButtonText}>+ 만들기</Text>
          </Pressable>
        </View>

        {/* 소개 영역 */}
        <View style={styles.intro}>
          <Text style={styles.heading}>
            오늘은 어떤 이야기를 나눌까요?
          </Text>
          <Text style={styles.description}>
            관심 있는 주제에 참여해 보세요.
          </Text>
        </View>

        {/* 카테고리 선택 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContainer}>
          {categories.map((category) => (
            <Pressable
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={[
                styles.categoryButton,
                selectedCategory === category &&
                  styles.selectedCategory,
              ]}>
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category &&
                    styles.selectedCategoryText,
                ]}>
                {category}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* 토론 목록 제목 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>진행 중인 토론</Text>
          <Text style={styles.count}>
            {filteredDiscussions.length}개
          </Text>
        </View>

        
        
          {/* 토론 카드 목록 */}
          {filteredDiscussions.map((item) => (
            <DiscussionCard
              key={item.id}
              discussion={item}
              onPress={() =>
                setNotice(`${item.title} 상세 화면은 다음에 구현합니다.`)
              }
            />
          ))}



        {/* 목록이 비어 있을 때 */}
        {filteredDiscussions.length === 0 && (
          <Text style={styles.emptyText}>
            해당 카테고리의 토론이 없습니다.
          </Text>
        )}

        {/* 버튼 반응 안내 */}
        {notice !== '' && (
          <Text style={styles.notice}>{notice}</Text>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// 4. 화면 디자인 설정

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  container: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  createButton: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  intro: {
    marginBottom: 24,
  },
  heading: {
    fontSize: 21,
    fontWeight: '700',
    color: '#111827',
  },
  description: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 8,
  },
  categoryContainer: {
    gap: 8,
    paddingBottom: 18,
  },
  categoryButton: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  selectedCategory: {
    backgroundColor: AppColors.primary,
  },
  categoryText: {
    color: '#374151',
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
  },
  count: {
    color: '#6B7280',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tag: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 12,
  },
  status: {
    color: '#6B7280',
    fontSize: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 14,
  },
  participants: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 30,
  },
  notice: {
    marginTop: 14,
    padding: 12,
    color: '#1D4ED8',
    backgroundColor: '#DBEAFE',
    borderRadius: 10,
  },
});
