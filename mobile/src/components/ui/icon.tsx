import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { AppColors } from '@/constants/theme';

// Figma B안과 같은 선 아이콘(24 그리드, 둥근 끝). 도형을 회전해 만들지 않고 경로를 그대로 쓴다.
export type IconName = 'home' | 'search' | 'chat' | 'plus' | 'user' | 'bell' | 'back' | 'right' | 'down' | 'up' | 'spark' | 'reply' | 'close' | 'send' | 'check';

export function Icon({ name, size = 24, color = AppColors.text, strokeWidth = 1.8 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const p = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    {name === 'home' && <Path {...p} d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z" />}
    {name === 'search' && <><Circle {...p} cx={11} cy={11} r={7} /><Path {...p} d="m20 20-3.6-3.6" /></>}
    {name === 'chat' && <Path {...p} d="M20.5 12a8.5 8.5 0 0 1-12.3 7.6L3.5 20.5l1-4.4A8.5 8.5 0 1 1 20.5 12z" />}
    {name === 'plus' && <><Rect {...p} x={3.5} y={3.5} width={17} height={17} rx={5} /><Path {...p} d="M12 8v8M8 12h8" /></>}
    {name === 'user' && <><Circle {...p} cx={12} cy={8} r={4} /><Path {...p} d="M4 21c1.6-4 4.6-6 8-6s6.4 2 8 6" /></>}
    {name === 'bell' && <><Path {...p} d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15z" /><Path {...p} d="M10 20.5a2 2 0 0 0 4 0" /></>}
    {name === 'back' && <Path {...p} d="m15 5-7 7 7 7" />}
    {name === 'right' && <Path {...p} d="m9 5 7 7-7 7" />}
    {name === 'down' && <Path {...p} d="m6 9 6 6 6-6" />}
    {name === 'up' && <Path {...p} d="M12 5 19 13h-4.5v6h-5v-6H5z" />}
    {name === 'spark' && <Path {...p} d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />}
    {name === 'reply' && <><Path {...p} d="M9 14 4 9l5-5" /><Path {...p} d="M4 9h10a6 6 0 0 1 6 6v4" /></>}
    {name === 'close' && <Path {...p} d="M6 6l12 12M18 6 6 18" />}
    {name === 'send' && <Path {...p} d="M4 12 20 4l-5 16-3-7z" />}
    {name === 'check' && <Path {...p} d="M5 12.5 10 17.5 19 7" />}
  </Svg>;
}
