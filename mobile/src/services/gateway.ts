import { createMockGateway } from './mock-gateway';

export const dataSource = process.env.EXPO_PUBLIC_DATA_SOURCE ?? 'mock';
// 실제 HTTP 어댑터 구현 전 api/잘못된 설정에서 Mock으로 조용히 대체하지 않습니다.
export const gateway = createMockGateway({ enabled: dataSource === 'mock' });
