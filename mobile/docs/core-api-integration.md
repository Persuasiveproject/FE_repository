# 핵심 화면 API 연동 안내

현재 모든 새 기능은 `AppGateway`라는 공통 데이터 창구를 사용합니다. 인터페이스는 FE 화면이 필요한 데이터를 정의한 것이며 확정된 BE API 명세가 아닙니다.
확인되지 않은 URL이나 토큰 방식을 추측해 넣지 않았습니다. BE 파일은 변경하지 않았습니다.

## 1. 코드 위치

| 위치 | 역할 |
| --- | --- |
| `src/types/core.ts` | 화면에 맞춘 모델 |
| `src/types/api.ts` | 이전 작업에서 확인한 참여 목록/공통 오류 DTO |
| `src/services/app-gateway.ts` | 핵심 기능 전체의 데이터 인터페이스 |
| `src/services/mock-gateway.ts` | 현재 메모리 구현 |
| `src/services/gateway.ts` | 구현을 선택하는 한 곳 |
| `src/services/api-client.ts` | 기존 HTTP 요청·오류·공개/인증 필요 가드 |
| `src/services/joined-debates.ts` | 확인된 참여 목록 요청. 인증 미설정으로 실제 요청은 차단 |
| `src/services/demo-phone.ts` | 실제 SMS가 아닌 폼 체험용 함수 |
| `src/features/session/session-provider.tsx` | 프로필·세션 공유, 로그인/로그아웃 후 refresh |
| `src/services/discussions.ts` | 기존 홈/목록 함수와 새 gateway를 연결 |

기본값은 `EXPO_PUBLIC_DATA_SOURCE=mock`입니다. `api` 또는 다른 값은 INTEGRATION_PENDING 오류를 표시합니다.
API 모드에서 Mock으로 자동 대체하지 않습니다. 현재는 실제 HTTP gateway가 없으므로 환경변수 변경만으로 연결되지 않습니다.
`EXPO_PUBLIC_API_BASE_URL`은 실제 서버 origin이며 비밀키·토큰 저장 장소가 아닙니다.

## 2. 기능별 데이터 계약

다음 이름은 FE 함수입니다. 서버 URL을 뜻하지 않습니다.

| FE 함수 | 입력 | 화면에서 필요한 결과·합의 사항 |
| --- | --- | --- |
| `getSession` | 없음 | Profile 또는 비회원 null. 만료·네트워크 오류와 비회원 구분 필요 |
| `signInDemo`, `signUpDemo` | 가입: nickname, interests, 필수 확인 | 현재 데모 전용. 실제 로그인/가입 함수는 확정된 인증 계약으로 새로 설계 |
| `signOut`, `updateProfile` | 프로필: nickname, interests | 세션 무효화, 프로필 반환, 중복 닉네임·오류 처리 |
| `listDebates`, `getDebate` | 상세: string id | 제목·설명·카테고리·인원·의견 수·방식·마감·내 최초/현재 입장·version |
| `listJoined` | OPEN 또는 CLOSED | 참여 토론 목록. 실서버는 cursor 페이지네이션 연결 필요 |
| `createDebate` | category, kind, durationMinutes, title, content; requestId | 생성 토론. 코인·게시 비용·마감·일/활성 제한은 서버가 원자적으로 검증 |
| `joinDebate` | debateId, PRO/CON/NEUTRAL | 최초/현재 입장과 version. 중복 참여는 중복 인원 증가 금지 |
| `listOpinions`, `getOpinion` | 토론 ID, 선택 부모 의견 ID / 의견 ID | Opinion: 글·작성 당시 입장·익명 표시·추천/비추천·내 투표·답글 수 |
| `postOpinion` | debateId, content, 선택 parentId; requestId | 게시된 Opinion. 원래 의견/답글 관계·등록 후 수정 정책 확인 |
| `voteOpinion` | debateId, opinionId, UP/DOWN | 변경된 Opinion. 취소/전환·자기 글 금지·중복 요청 정책 확인 |
| `changeStance` | debateId, stance, 선택 opinionId, version | Membership. 최초 입장과 과거 글 보존, 버전 충돌 처리 |
| `getResults` | debateId | 최종 인원·입장별 수·입장 변화·의견/답글 수·집계 시각·숨김 정책 |
| `getSummary` | debateId | 요약 섹션과 근거 opinionIds, 생성 시각. 생성 중/실패 상태 필요 |
| `getWallet` | 없음 | 코인 잔액·거래 이력. 현재 충전/환불 함수 없음 |

ID는 모두 문자열로 유지합니다. BE의 64비트 숫자 ID를 `Number(id)`로 바꾸지 않습니다.
`ai-class`, `closed-demo`, `demo-101`은 화면 확인용 ID입니다. 이 값을 실서버에 전송하지 않습니다.
익명 표시용 이름과 내부 authorId는 서버의 개인정보 노출 정책에 맞춰 최소화해야 합니다.

## 3. 확인된 BE와 연결할 때 주의할 점

확인 기준: [BE develop e72c8a4](https://github.com/Persuasiveproject/BE_repository/tree/e72c8a446077eceff653ee52fc31078a2f490e33), 2026-11-08.
전체 근거·공통 오류·인증 상태는 [backend-contract.md](backend-contract.md)에 있습니다. 배포 서버 테스트 결과는 아닙니다.

| 확인된 경로 | FE 연결 시 해야 할 일 |
| --- | --- |
| GET `/v1/me/debates` | 인증 + cursor 처리. 반환 DTO에는 description·카테고리 이름·현재 입장이 없어 상세/매핑 계약 필요 |
| GET/PATCH `/v1/debates/{id}/me/stance` | PRO/CON/NEUTRAL, version, 선택 opinionId를 매핑. GET 응답 포장과 PATCH 응답 확인 |
| GET `/v1/debates/{id}/me/events` | 입장 변경 이력·크레딧 등의 활용 범위 협의 |
| GET `/v1/debates/{id}/timing` | 서버 기준 시작/종료 시각으로 보정. 클라이언트 시계만으로 권한을 결정하지 않기 |
| GET `/v1/debates/{id}/result` | counts → 화면 집계 매핑. sankeyData 스키마·null·집계 준비 중 상태 처리 |

PATCH 입장은 `stance`, 선택 `opinionId`(양의 64비트 정수 문자열), 선택 `version`(0 이상 정수)을 받습니다.
FE에서는 오래된 화면의 요청을 감지하도록 version을 항상 넘깁니다. 서버의 오류 코드와 메시지를 실제 명세에 맞게 매핑해야 합니다.

결과 API의 `data.counts`는 totalParticipants, opinionCount, rebuttalCount, finalPro, finalCon, finalNeutral,
stanceChangedCount, stanceKeptCount입니다. 뒤의 두 값은 null 가능성이 있습니다.
`data`에는 sankeyData, genderData, ageData, regionData, genderHidden, ageHidden, computedAt도 있습니다.
현재 인구통계 데이터는 null이며 UI는 이를 임의로 만들어 채우지 않습니다.
흐름도는 `Transition[]`이 필요하지만 BE의 sankeyData 형식이 명확히 합의되지 않았으므로 아직 변환기를 작성하지 않았습니다.
결과 응답에는 제목·마감 시각이 없어 별도 토론 상세와 결합해야 합니다.
409 RESULT_NOT_READY의 PENDING/FAILED는 로딩·재시도 UI로 구분하는 작업이 필요합니다.

현재 `DebateResults.demographics`는 null만 지원합니다. 실제 공개 통계 계약이 확정되면 타입과 UI를 함께 확장하세요.
데모의 160명·코인 10개·크레딧 30·요약 문장은 실제 서버 응답이 아닙니다.

## 4. 실제 연결 순서

1. BE와 로그인·세션/토큰·갱신·로그아웃·웹 CORS/CSRF·앱 저장소 정책을 확정합니다. 현재 BE 테스트의 force_authenticate는 로그인 구현이 아닙니다.
2. 실제 전화번호 인증·가입·약관 원문/버전/동의 저장·카카오 리다이렉트 계약을 확정합니다. demo-phone의 123456 코드는 제거 대상인 데모 구현입니다.
3. 확정된 요청/응답 DTO와 런타임 검증/매핑을 추가합니다. `types/core.ts`의 UI 모델에 응답을 그대로 타입 단언하지 않습니다.
4. `services/http-gateway.ts` 같은 파일에서 `AppGateway`의 HTTP 구현을 작성합니다. 데모 전용 인증 함수는 실제 인증에 맞는 이름/입력으로 정리하고 호출 화면도 연결합니다.
5. 기존 `api-client.ts`의 인증 필요 가드를 실제 정책에 따라 구현합니다. 아직 Bearer 방식으로 가정하지 않습니다.
6. `gateway.ts`에서 mock/http를 명확히 선택합니다. `api` 실패를 Mock 성공으로 위장하지 않습니다.
7. 홈 인기/추천 계약이 따로 생기면 `services/discussions.ts`의 데모 추천도 실서버 응답으로 교체합니다.
8. 목록/의견의 페이지네이션, 토론 갱신 방식(재조회·폴링·실시간), 키보드/네트워크 취소, 인증 만료를 실제 API와 검증합니다.
9. requestId의 서버 멱등성 키 계약을 합의합니다. 현재 메모리 Map은 앱 실행 중 중복 방지일 뿐, 서버·기기 간 재시도는 해결하지 않습니다.
10. 서버가 코인 차감·생성 제한·입장 버전·마감·참여 권한을 다시 검증하는지 통합 테스트합니다. FE 검증은 사용자 안내용입니다.

실서버에는 사용자별 저장, 인증·권한, 비용 처리, 페이지네이션, 결과 집계·비공개 정책을 BE에서 구현해야 하고,
FE에도 그 계약에 맞춘 HTTP 어댑터와 통합 테스트가 남아 있습니다. 화면 UI와 데이터 창구를 분리해 그때의 수정 범위를 줄였습니다.

## 5. 오류와 상태

조회 화면은 loading/error/success와 재시도를 공통으로 처리합니다. 없는 ID는 NOT_FOUND 안내로 처리합니다.
쓰기 화면은 요청 중 잠금과 오류 문구를 표시합니다. 데모 오류 코드는 AUTH_REQUIRED, NOT_PARTICIPANT,
DEBATE_CLOSED, VALIDATION_ERROR, INSUFFICIENT_COINS, CREATE_LIMIT, STANCE_CONFLICT, RESULT_NOT_READY 등입니다.
실제 BE 오류 코드는 `ApiError`에 보존하고 화면별로 적절한 안내·재로그인·재조회로 바꾸세요.
사용자에게 서버 스택이나 토큰이 노출되는 원문 오류를 그대로 표시하지 않도록 실제 연결 시 오류 메시지 정책도 확인합니다.
