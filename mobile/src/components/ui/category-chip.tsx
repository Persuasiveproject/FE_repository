import { Pressable, StyleSheet, Text } from 'react-native';
import { AppTypography } from '@/constants/theme';

// 카테고리 색. 찬성(파랑)·반대(빨강)와 헷갈리지 않게 그 두 색상 범위를 피했다(색상환 거리 28° 이상).
// 글자·배경 대비는 모두 5:1 이상(WCAG AA 4.5:1 기준). 색만으로 구분하지 않도록 이름은 늘 글자로 쓴다.
const COLORS: Record<string, { bg: string; fg: string }> = {
  '대학생활': { bg: '#F9EEE2', fg: '#865013' },
  '진로·경제': { bg: '#F9F5E2', fg: '#786711' },
  '사회': { bg: '#F3F9E2', fg: '#587010' },
  '건강·운동': { bg: '#E9F9E2', fg: '#327411' },
  '환경': { bg: '#E2F9E9', fg: '#117834' },
  '기술·AI': { bg: '#E2F9F6', fg: '#117467' },
  '문화·여가': { bg: '#EEE2F9', fg: '#501386' },
  '연애·관계': { bg: '#F9E2F7', fg: '#86137C' },
  '일상 고민': { bg: '#EEF0F2', fg: '#4A515C' },
};
// 목록에 없는 카테고리(시연용 옛 이름 등)는 이름으로 같은 색을 고른다. 화면마다 같은 카테고리는 같은 색이다.
const FALLBACK = Object.values(COLORS).slice(0, 8);
export function categoryColor(name: string) {
  const clean = name.replace(/^\[[^\]]*\]\s*/, '').trim();
  if (COLORS[clean]) return COLORS[clean];
  let hash = 0;
  for (const ch of clean) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK[hash % FALLBACK.length];
}

type Props = { name: string; onPress?: () => void; accessibilityLabel?: string; size?: 'sm' | 'md' };
export function CategoryChip({ name, onPress, accessibilityLabel, size = 'sm' }: Props) {
  const color = categoryColor(name);
  const label = <Text style={[styles.text, size === 'md' && styles.textMd, { color: color.fg }]} numberOfLines={1}>{name}</Text>;
  if (!onPress) return <Text style={[styles.chip, size === 'md' && styles.chipMd, { backgroundColor: color.bg, color: color.fg }, styles.text, size === 'md' && styles.textMd]} numberOfLines={1}>{name}</Text>;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? name} hitSlop={8} onPress={onPress}
    style={({ pressed }) => [styles.chip, size === 'md' && styles.chipMd, { backgroundColor: color.bg }, pressed && styles.pressed]}>{label}</Pressable>;
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', alignSelf: 'flex-start' },
  chipMd: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  text: { ...AppTypography.caption, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  textMd: { fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.7 },
});
