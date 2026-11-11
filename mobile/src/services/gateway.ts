import { createMockGateway } from './mock-gateway';
import { createHttpGateway } from './http-gateway';

export const dataSource = process.env.EXPO_PUBLIC_DATA_SOURCE ?? 'mock';
// API 모드는 시연용 Basic 인증 HTTP 구현을 사용합니다.
// 잘못된 설정이나 서버 오류를 데모 성공으로 대체하지 않습니다.
const unavailable = createMockGateway({ enabled: false });
export const gateway = dataSource === 'mock' ? createMockGateway() : dataSource === 'api' ? createHttpGateway() : unavailable;
