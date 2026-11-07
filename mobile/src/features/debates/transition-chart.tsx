import { View } from 'react-native';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import { STANCES, STANCE_LABEL } from '@/features/core/rules';
import { STANCE_COLOR } from '@/features/opinions/opinion-card';
import type { Transition } from '@/types/core';

// 고정 이미지 대신 인원 데이터로 폭을 계산합니다. 화면 폭에 맞춰 viewBox가 축소됩니다.
export function TransitionChart({ transitions, total }: { transitions: Transition[]; total: number }) {
  if (total <= 0 || transitions.length === 0) return null;
  const scale = 180 / total;
  const source = STANCES.map((stance) => transitions.filter((item) => item.from === stance).reduce((sum, item) => sum + item.count, 0));
  const target = STANCES.map((stance) => transitions.filter((item) => item.to === stance).reduce((sum, item) => sum + item.count, 0));
  const positions = (counts: number[]) => counts.map((_, index) => 12 + counts.slice(0, index).reduce((sum, count) => sum + count * scale + 16, 0));
  const starts = positions(source);
  const ends = positions(target);
  const sourceOffsets = [0, 0, 0]; const targetOffsets = [0, 0, 0];
  const paths = transitions.map((item, index) => {
    const from = STANCES.indexOf(item.from); const to = STANCES.indexOf(item.to);
    const height = item.count * scale;
    const y1 = starts[from] + sourceOffsets[from]; const y2 = ends[to] + targetOffsets[to];
    sourceOffsets[from] += height; targetOffsets[to] += height;
    return <Path key={index} d={`M 64 ${y1} C 140 ${y1}, 184 ${y2}, 258 ${y2} L 258 ${y2 + height} C 184 ${y2 + height}, 140 ${y1 + height}, 64 ${y1 + height} Z`} fill={STANCE_COLOR[item.from]} opacity={0.28} />;
  });
  return <View accessible accessibilityLabel="첫 입장에서 최종 입장으로 변화한 참여자 흐름. 아래 숫자로도 확인할 수 있습니다.">
    <Svg width="100%" height={240} viewBox="0 0 322 240">
      {paths}
      {STANCES.map((stance, index) => <ViewlessNodes key={stance} stance={stance} source={source[index]} target={target[index]} y1={starts[index]} y2={ends[index]} scale={scale} />)}
    </Svg>
  </View>;
}
function ViewlessNodes({ stance, source, target, y1, y2, scale }: { stance: keyof typeof STANCE_COLOR; source: number; target: number; y1: number; y2: number; scale: number }) {
  return <>
    <Rect x={56} y={y1} width={8} height={Math.max(1, source * scale)} rx={3} fill={STANCE_COLOR[stance]} />
    <Rect x={258} y={y2} width={8} height={Math.max(1, target * scale)} rx={3} fill={STANCE_COLOR[stance]} />
    <SvgText x={0} y={y1 + 12} fontSize={11} fill="#637381">{STANCE_LABEL[stance]}</SvgText>
    <SvgText x={0} y={y1 + 27} fontSize={11} fill="#637381">{source}명</SvgText>
    <SvgText x={276} y={y2 + 12} fontSize={11} fill="#637381">{STANCE_LABEL[stance]}</SvgText>
    <SvgText x={276} y={y2 + 27} fontSize={11} fill="#637381">{target}명</SvgText>
  </>;
}
