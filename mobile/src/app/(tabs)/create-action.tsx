import { Redirect } from 'expo-router';

// NativeTabs에는 항목마다 경로가 필요합니다. 실제 생성 화면은 기존 Stack 경로를 사용합니다.
// 이 주소를 직접 열어도 빈 화면 대신 실제 생성 화면으로 이동합니다.
export default function CreateActionScreen() {
  return <Redirect href="/discussions/create" />;
}
