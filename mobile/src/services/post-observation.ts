// 늦게 도착한 목록 GET이 새 반응 응답의 표수를 덮지 않도록 요청 순서를 기록합니다.
import type { PublicPostDto } from '../types/api';
let revision = 0;
const reads = new WeakMap<PublicPostDto, number>();
export const nextPostRevision = () => ++revision;
export const rememberPostRead = (post: PublicPostDto, started: number) => { reads.set(post, started); };
export const getPostReadRevision = (post: PublicPostDto) => reads.get(post) ?? 0;
