import { DomainError } from './app-gateway';
import { dataSource } from './gateway';

const challenges = new Set<string>();
let nextChallenge = 0;
export async function requestDemoCode(phone: string): Promise<string> {
  if (dataSource !== 'mock') throw new DomainError('INTEGRATION_PENDING', '휴대폰 인증 API 연결이 필요합니다.');
  if (!/^01[016789]\d{7,8}$/.test(phone.replace(/[-\s]/g, ''))) throw new DomainError('INVALID_PHONE', '휴대폰 번호 형식을 확인해 주세요.');
  const id = `demo-challenge-${++nextChallenge}`;
  challenges.add(id);
  return id; // 전화번호를 저장하거나 SMS를 보내지 않습니다.
}
export async function verifyDemoCode(challenge: string, code: string): Promise<void> {
  if (dataSource !== 'mock') throw new DomainError('INTEGRATION_PENDING', '휴대폰 인증 API 연결이 필요합니다.');
  if (!challenges.has(challenge) || code !== '123456') throw new DomainError('INVALID_CODE', '화면 확인용 데모 코드 123456을 입력해 주세요.');
  challenges.delete(challenge);
}
