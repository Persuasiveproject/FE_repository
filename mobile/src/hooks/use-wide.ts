import { Platform } from 'react-native';
import { useWindowClass } from './use-window-class';

// PC·가로 태블릿 웹에서만 패널 배치를 쓴다. 휴대폰과 네이티브 앱은 기존 한 열 화면 그대로.
export function useWide() {
  const layout = useWindowClass();
  return Platform.OS === 'web' && layout === 'expanded';
}

// 왼쪽 메뉴(레일·사이드바)를 보여 줄지. 세로 태블릿부터 보인다.
export function useSideNav(): 'rail' | 'sidebar' | null {
  const layout = useWindowClass();
  if (Platform.OS !== 'web' || layout === 'compact') return null;
  return layout === 'expanded' ? 'sidebar' : 'rail';
}
