import { useWindowDimensions } from 'react-native';

// Material Design 3의 창 크기 구분을 따른다.
// compact(600 미만): 휴대폰 → 하단 탭, medium(600~839): 세로 태블릿 → 왼쪽 레일,
// expanded(840 이상): 가로 태블릿·PC → 왼쪽 사이드바.
export type WindowClass = 'compact' | 'medium' | 'expanded';

export function windowClassFor(width: number): WindowClass {
  if (width >= 840) return 'expanded';
  if (width >= 600) return 'medium';
  return 'compact';
}

export function useWindowClass(): WindowClass {
  const { width } = useWindowDimensions();
  return windowClassFor(width);
}
