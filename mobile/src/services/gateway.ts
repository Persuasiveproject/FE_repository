import { createMockGateway } from './mock-gateway';

export const dataSource = process.env.EXPO_PUBLIC_DATA_SOURCE ?? 'mock';
// 공개 조회는 public-api.ts에서 연결합니다. 인증/쓰기 기능은 연동 전까지 차단합니다.
// api/잘못된 설정에서 데모 데이터로 자동 대체하지 않습니다.
const unavailable = createMockGateway({ enabled: false });
export const gateway = dataSource === 'mock' ? createMockGateway() : {
  ...unavailable,
  // 실제 인증을 구현하기 전 api 모드는 비로그인 읽기만 지원합니다.
  getSession: async () => null,
};
