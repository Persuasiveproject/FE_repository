import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppColors, AppSpacing, AppTypography, StanceColors } from '@/constants/theme';
import type { Stance } from '@/types/core';
import { CategoryChip } from './category-chip';

/**
 * Figma B안 공통 요소.
 * - StatusSign: 진행 중은 초록 점 + '영업중', 종료는 회색 점 + '문 닫음'
 * - AnonAvatar: 익명 번호를 동물 캐릭터로 보여 준다. 화면 표시만 바꾸며 서버 데이터는 그대로다.
 * - StanceBar: 찬반 비율 막대. 비율 데이터가 있는 화면에서만 쓴다.
 */

const ANIMALS = [
  { name: '수달', color: '#E1EAF7' }, { name: '고래', color: '#DDF0EA' }, { name: '여우', color: '#FBE6D6' },
  { name: '부엉', color: '#ECE4F6' }, { name: '판다', color: '#E9EAEC' }, { name: '펭귄', color: '#E0EEF6' },
  { name: '다람', color: '#F6ECD9' }, { name: '사슴', color: '#E8F1DD' },
] as const;

// 같은 토론의 같은 익명 번호는 항상 같은 캐릭터가 된다. 9번째부터는 이름 뒤에 번호를 붙여 구분한다.
export function animalFor(anonymousNo?: number | null) {
  const n = anonymousNo && anonymousNo > 0 ? anonymousNo : 0;
  const base = ANIMALS[n % ANIMALS.length];
  const round = Math.floor((n - 1) / ANIMALS.length);
  return { name: round > 0 ? `${base.name} ${round + 1}` : base.name, color: base.color };
}

// '익명 3' 같은 표시 이름에서 번호를 꺼낸다. 번호가 없으면 이름 첫 글자를 쓴다.
export function anonymousNoFrom(authorName: string) {
  const match = /(\d+)\s*$/.exec(authorName);
  return match ? Number(match[1]) : null;
}

export function displayName(authorName: string, anonymousNo?: number | null) {
  const no = anonymousNo ?? anonymousNoFrom(authorName);
  return no === null ? authorName : animalFor(no).name;
}

export function AnonAvatar({ authorName, anonymousNo, size = 30, ring }: { authorName: string; anonymousNo?: number | null; size?: number; ring?: string }) {
  const no = anonymousNo ?? anonymousNoFrom(authorName);
  const animal = no === null ? { name: authorName, color: AppColors.soft } : animalFor(no);
  return <View aria-hidden
    style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: animal.color },
      ring ? { borderWidth: 2, borderColor: ring } : null]}>
    <Text style={[styles.avatarText, { fontSize: Math.round(size * 0.42) }]}>{animal.name.slice(0, 1)}</Text>
  </View>;
}

export function AvatarStack({ numbers, size = 22, ring = AppColors.surface }: { numbers: number[]; size?: number; ring?: string }) {
  return <View style={styles.stack}>
    {numbers.map((no, index) => <View key={no} style={{ marginLeft: index === 0 ? 0 : -8, zIndex: numbers.length - index }}>
      <AnonAvatar authorName="" anonymousNo={no} size={size} ring={ring} />
    </View>)}
  </View>;
}

// extra 항목에 onPress를 주면 누를 수 있는 작은 칩으로 보인다(예: 카드의 카테고리로 걸러 보기).
export type SignExtra = string | { text: string; onPress: () => void; accessibilityLabel?: string } | null | undefined;

// 카테고리 색 칩 다음에 회색 부가 정보(손님 수, 남은 시간 등). 문 닫은 토론만 맨 앞에 '문 닫음'.
export function StatusSign({ closed, extra, category, onCategoryPress }: { closed?: boolean; extra?: SignExtra[]; category?: string | null; onCategoryPress?: () => void }) {
  const items = (extra ?? []).filter((item): item is Exclude<SignExtra, null | undefined> => !!item);
  return <View style={styles.sign}>
    {closed && <Text style={[styles.signText, { color: AppColors.textSecondary }]}>문 닫음</Text>}
    {!!category && <CategoryChip name={category} onPress={onCategoryPress} accessibilityLabel={onCategoryPress ? `${category} 토론만 보기` : undefined} />}
    {items.map((item, index) => typeof item === 'string'
      ? <Text key={`${item}-${index}`} style={[styles.signExtra, (index > 0 || !!category || closed) && styles.signFaint]}>{item}</Text>
      : <Pressable key={`${item.text}-${index}`} accessibilityRole="button" accessibilityLabel={item.accessibilityLabel ?? item.text}
          hitSlop={8} onPress={item.onPress} style={({ pressed }) => [styles.signChip, pressed && styles.signChipPressed]}>
          <Text style={styles.signExtra}>{item.text}</Text>
        </Pressable>)}
  </View>;
}

export function StanceBar({ pro, height = 8, style }: { pro: number; height?: number; style?: StyleProp<ViewStyle> }) {
  const share = Math.max(0, Math.min(100, Math.round(pro)));
  return <View accessibilityLabel={`찬성 ${share}퍼센트, 반대 ${100 - share}퍼센트`} style={[styles.bar, style]}>
    <View style={{ flex: share || 0.0001, height, borderRadius: height / 2, backgroundColor: StanceColors.PRO.bar }} />
    <View style={{ flex: 100 - share || 0.0001, height, borderRadius: height / 2, backgroundColor: StanceColors.CON.bar }} />
  </View>;
}

export function StanceLabel({ stance, text }: { stance: Stance; text: string }) {
  return <Text style={[styles.stanceLabel, { color: StanceColors[stance].text }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '700', color: AppColors.text },
  stack: { flexDirection: 'row', alignItems: 'center' },
  sign: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  // 웹에서는 은은한 빛, 앱에서는 그림자 대신 같은 색 점만 보인다.
  dotOpen: { backgroundColor: AppColors.open, boxShadow: '0 0 8px rgba(18, 183, 106, 0.55)' },
  dotClosed: { backgroundColor: AppColors.textFaint },
  signText: { ...AppTypography.caption, fontWeight: '700' },
  signExtra: { ...AppTypography.caption, color: AppColors.textSecondary, fontWeight: '500' },
  signFaint: { color: AppColors.textFaint, fontWeight: '400' },
  signChip: { backgroundColor: AppColors.soft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  signChipPressed: { backgroundColor: AppColors.border },
  bar: { flexDirection: 'row', gap: 3, alignItems: 'center', marginTop: AppSpacing.xs },
  stanceLabel: { ...AppTypography.caption, fontWeight: '700' },
});
