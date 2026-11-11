# 시연용 Basic 인증과 실제 서버 연동

작업일: 2026-11-11. 브랜치: `feat/demo-basic-auth`.
기준 BE: `develop`의 `6f14a8ce065f10360796b719d8657d013511a94c`.

후속 작업으로 AI 요약·서버 시간·내 입장 변경 이력·알림·초안 수정을 연결했습니다.
추가 화면의 사용법·파일 역할·검증은 [나머지 API 안내](remaining-api-guide.md)에 정리했습니다.

**카카오 로그인은 이번 작업에서 구현하지 않았습니다.** 미리 발급받은 ACTIVE 일반 회원의 ID·비밀번호로 HTTPS 개발 서버를 사용하는 시연 전용 임시 인증입니다.
BE PR #40이 병합된 것을 확인했으며, 본인 확인 기록을 만들거나 VERIFIED로 바꾸지 않고 참여하는 정책을 실제 서버에서도 확인했습니다.

## 1. 실행과 로그인

`mobile/.env.local`에는 다음 공개 설정만 사용합니다. 계정 비밀번호를 넣지 않습니다.

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://dev-api.yeongup.shop
EXPO_PUBLIC_DATA_SOURCE=api
```

```powershell
cd C:\dev\FE_repository\mobile
npm.cmd start
# 웹 시연은 허용된 포트로 실행
npm.cmd run web -- --port 8082
```

기존 Expo를 종료하고 다시 실행한 뒤 앱을 완전히 새로고침합니다.
마이 → 로그인에서 **회원 ID·비밀번호**를 입력하고 **시연 계정으로 로그인**을 누릅니다.
계정은 앱에서 생성하지 않습니다. BE에서 미리 발급한 ACTIVE 일반 회원을 사용합니다.
카카오·전화번호 확인·데모 회원가입과 구분합니다. `mock` 모드의 기존 데모 기능은 유지합니다.

로그인은 실제 GET `/v1/me`가 성공하고 회원 상태·응답 ID를 검증한 뒤 확정됩니다.
실패 시 인증정보를 보관하지 않고 입력한 비밀번호는 성공·실패 모두 입력칸에서 지웁니다.

## 2. 인증정보 수명

- Basic 헤더는 앱 실행 중 메모리에만 보관합니다. 비밀번호·Authorization을 소스, 문서, 환경변수, localStorage/AsyncStorage/SecureStore 등에 기록하지 않습니다.
- 로그아웃·401 응답 시 인증정보와 이전 계정의 프로필·조회 캐시·재시도 기록을 지웁니다. 앱 재시작·웹 새로고침 후에는 다시 로그인합니다.
- 보호 요청은 로그인하지 않으면 `AUTH_REQUIRED`로 요청 전에 차단합니다. 이전 `AUTH_NOT_CONFIGURED` 고정 차단은 실제 인증 처리로 교체했습니다.
- 공개 카테고리 등은 인증 없이, 개인화 가능한 홈·상세는 로그인 상태에 따라, 내 정보·참여 목록·쓰기는 인증 필수로 요청합니다.
- Basic 인증을 HTTP로 전송하지 않습니다. 인증을 확인한 서버 origin에만 재사용하며 요청에 `redirect: error`를 설정합니다. 네이티브 전송 계층의 세부 동작은 실기기에서 추가 확인해야 합니다.
- 계정을 바꾸는 중 도착한 이전 응답을 새 계정 상태에 반영하지 않습니다. 초안 저장 같은 다단계 쓰기도 계정이 바뀌면 다음 단계를 중단합니다.
- 브라우저 쿠키·서버 세션 저장을 사용하지 않습니다. 따라서 앱 로그아웃은 서버의 OAuth 세션 종료 API를 호출하는 것과 다릅니다.

이는 시연용 비밀번호 인증의 범위입니다. 카카오 OAuth, 토큰 발급·갱신·영구 로그인은 별도 구현입니다.

## 3. 실제 연결한 흐름

| 기능 | 실제 API와 처리 |
| --- | --- |
| 로그인·마이·크레딧 | GET `/v1/me`. Decimal 크레딧은 문자열로 보존하며 실제 닉네임·관심 주제·대표 배지 표시 |
| 홈 개인화·내 참여 상태 | GET `/v1/home`, GET `/v1/debates/{id}`에 로그인 후 Basic 전달. `myParticipation`의 익명 번호·최초/현재 입장·version 사용 |
| 생성·게시 | POST `/v1/debates`로 초안 저장 → POST `/v1/debates/{id}/publish`로 게시·1코인 차감. 서버 카테고리 사용 |
| 참여 | POST `/v1/debates/{id}/participants`. PR #40에 따라 ACTIVE 회원은 본인 확인 없이 참여 |
| 의견·답글 | POST `/v1/debates/{id}/posts`. 현재 참여 입장은 서버가 기록하며 parentId는 답글에만 전달 |
| 입장 변경·영업 | PATCH `/v1/debates/{id}/me/stance`에 stance·version·선택 opinionId 전달. 성공 후 상세에서 새 version 재조회 |
| 참여 중 | GET `/v1/me/debates?status=OPEN/CLOSED`. 현재 화면은 최근 최대 20개 카드 조회. 응답에 없는 현재 입장은 임의로 채우지 않음 |
| 결과 | GET `/v1/debates/{id}/result`. 서버 counts·흐름도·computedAt 매핑. PENDING/FAILED는 오류 안내와 재시도로 처리 |

내 글 여부는 같은 토론의 `myParticipation.anonymousNo`와 의견의 `anonymousNo`를 비교합니다.
다른 사람의 실제 계정 ID를 만들거나 노출하지 않습니다. 내 글은 영업 근거에서 제외하고 서버도 다시 검증합니다.
제거된 GET 내 입장 API를 다시 추가하거나 호출하지 않습니다.

### 코인과 크레딧

`/v1/me`에는 코인 잔액이 없습니다. 로그인 직후 잔액은 “서버에서 게시 시 확인”이며 임의의 0·10코인을 넣지 않습니다.
게시 응답의 `coinBalance`를 받은 뒤에만 메모리에 마지막 확인 잔액을 보관합니다. 최종 비용·잔액 검증은 서버가 수행합니다.
다른 기기의 변경이나 별도 코인 지급이 자동으로 동기화되는 지갑 기능은 아닙니다.
크레딧은 소수점 여섯 자리 문자열을 유지해 JavaScript 숫자 변환으로 정밀도를 잃지 않습니다.

### 재시도와 중복 방지

게시·참여·의견·입장 변경은 `Idempotency-Key`를 전달합니다. 같은 작업의 재시도에는 같은 키를 사용합니다.
게시 응답이 유실돼도 저장한 draft ID와 게시 키로 재시도하므로 초안을 다시 만들거나 코인을 다시 차감하지 않습니다.
같은 생성 작업에서 초안 저장 후 내용을 바꾸면 이전 게시 결과 확인을 안내합니다. 의견도 같은 작성 작업에는 같은 키를 유지해, 이전 등록이 완료됐다면 서버가 내용 변경 재시도를 거절하도록 합니다.
단, **초안 생성 POST 자체는 서버가 멱등성을 제공하지 않습니다.** 그 응답이 유실되면 결과 불명확 안내를 표시하고 자동 재생성을 막습니다.
재시도 상태도 메모리 전용입니다. 새로고침·로그아웃으로 지운 경우에는 BE에서 초안·게시 여부를 확인한 뒤 새 작업을 진행합니다.
계정 변경은 진행 중 요청을 서버에서 취소한다는 뜻은 아닙니다. 이미 완료된 서버 변경은 유지되며, 새 계정으로 다음 요청을 이어 보내지 않습니다.

## 4. 실제 HTTPS 검증 결과

일반 시연 계정 A/B 모두 `/v1/me`에서 HTTP 200·ACTIVE·본인 확인 미완료를 확인했습니다.
검증용 **토론 16**을 5분 간단토론으로 게시했고 시연 코인 1개를 사용했습니다.

1. A: 로그인 → 초안 생성 → 게시 → 같은 게시 재시도에서 토론 ID·코인 잔액 유지.
2. A: 본인 확인 없이 찬성 참여 → 의견 등록.
3. 로그아웃 후 인증정보 제거와 보호 요청 차단 확인.
4. B: 로그인 → 참여 전 `myParticipation=null` 확인 → 반대 참여.
5. 같은 참여 요청 재시도 후 참여자는 2명으로 유지.
6. B: 의견 등록·동일 요청 재시도에서 같은 글 ID 유지 → A 의견에 답글 등록·조회.
7. A 글은 다른 작성자, B 글은 내 글로 매핑되는지 확인.
8. B: A 의견을 근거로 반대→찬성 변경. 최초 입장은 반대 유지, version 증가·상세 재조회 확인.
9. B 참여 중 목록 조회, 진행 중 결과 `RESULT_NOT_READY` 확인.
10. 실제 5분 마감·자동 집계를 기다린 뒤 결과 조회 성공.

최종 결과는 **참여자 2명, 찬성 2명, 의견 2개, 답글 1개**입니다.
20명 미만이라 changed/kept는 null, 흐름도는 빈 배열인 것을 확인했습니다. 공개 제한을 가짜 숫자로 채우지 않습니다.
이 검증은 실제 FE HTTP gateway를 Node에서 실행한 서버 통합 검사입니다. 브라우저에서 모든 버튼을 클릭한 검사나 휴대폰 실기기 검사는 아닙니다.
서버의 시연 자료는 삭제하지 않았습니다. 인증정보는 결과 기록에 포함하지 않았습니다.

GET과 인증·Content-Type·Idempotency-Key가 필요한 PATCH의 CORS preflight가 `http://localhost:8082`를 허용하는 것도 확인했습니다.

## 5. 파일별 역할

| 파일 | 역할 |
| --- | --- |
| `src/services/basic-auth.ts` | UTF-8 Basic 인코딩, 메모리 인증정보, 계정 변경 revision, 작업 키 생성 |
| `src/services/api-client.ts` | 공개/선택/필수/로그인 요청 구분, HTTPS·origin·redirect 검사, 401 해제, 멱등성 헤더 전달 |
| `src/services/http-gateway.ts` | 기존 화면용 AppGateway를 실제 요청에 연결. 초안→게시·재시도·입장 재조회 처리 |
| `src/services/http-models.ts` | 회원·참여·의견·결과 응답을 화면 모델로 검사·변환 |
| `src/services/gateway.ts` | mock/http 구현 선택 |
| `src/features/auth/login-screen.tsx` | 회원 ID·비밀번호 시연 로그인 폼. 입력 비밀번호는 요청 후 제거 |
| `src/features/session/session-provider.tsx` | 로그인·로그아웃·계정 변경을 화면들에 공유. 이전 계정 응답 무시 |
| `src/features/debates/create-screen.tsx` | 서버 카테고리와 실제 게시 비용 안내 |
| `src/features/debates/api-detail-screen.tsx`, `stance-screen.tsx` | 내 입장·참여·의견 작성·입장 변경 진입 |
| `src/features/opinions/public-opinion-feed.tsx`, `api-thread-screen.tsx`, `compose-screen.tsx` | 익명 글 소유 여부, 답글 작성, 영업 근거 이동 |
| `src/features/debates/results-screen.tsx` | 실제 서버 결과 표시·재시도 |
| `src/features/account/` | 실제 내 정보/참여 목록 표시와 아직 없는 기능의 준비 상태 |
| `src/types/core.ts` | 모르는 코인/null 마감/문자열 크레딧/익명 번호를 표현 |
| `tests/basic-auth.test.ts` | 인증 수명·origin·401·계정 전환·재시도·결과 계약 테스트 |

화면 스타일을 바꾸려면 기존 공통 컴포넌트·theme을, 서버 계약이 바뀌면 HTTP gateway/model을 수정합니다.
Basic 인증을 카카오 구현으로 교체할 때는 인증 모듈과 로그인 화면을 먼저 바꾸고 API·쓰기 계약을 재검증합니다.

## 6. 아직 남은 범위

- 카카오 로그인·실제 가입·본인 확인·영구 로그인.
- 업보트/다운보트: 현재 BE URL에 반응 API가 없어 비활성화 유지. **입장 변경/영업과 구분**합니다.
- 프로필 수정·지갑/코인 내역은 BE API가 없어 준비 상태입니다. AI 요약은 후속 작업에서 실제 조회를 연결했습니다.
- 참여 목록의 다음 페이지 UI, 근거 선택 목록의 20개 이후 탐색, 직접 URL 진입 시 단일 원문 조회 계약은 후속 과제입니다.
- 브라우저 클릭과 실제 휴대폰에서 키보드·뒤로 가기·계정 교체·마감 전후를 최종 확인해야 합니다.

## 7. 점검 명령

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run test:api
```

`test:api`는 공개 GET만 수행합니다. 실제 계정의 쓰기 검증은 서버 자료와 코인을 사용하므로 일반 테스트에 자동 포함하지 않았습니다.
비밀번호를 실행 명령 인자·설명 문서에 복사하지 말고 앱 로그인 입력칸에서 입력합니다.

Basic 인증 단계 검사: TypeScript·ESLint·단위 테스트 **50개**, 웹 **23개 경로 HTTP/SSR**, Android/iOS/Web 전체 번들 생성이 통과했습니다. 이후 5개 API를 추가한 최종 점검은 [추가 API 안내](remaining-api-guide.md)를 확인하세요.
번들 결과는 Git에서 무시되는 `.expo/demo-basic-auth-export`에 저장했습니다.
실제 gateway HTTPS 통합 검증과 별개로 브라우저 클릭·휴대폰 실기기 검사는 남아 있습니다.
Basic 인증 구현 단계에서는 검사용 웹 서버를 종료했고 Commit·Push·PR 생성·Merge를 수행하지 않았습니다. 이후 사용자 요청으로 진행한 PR #8/#9 통합은 [추가 API 안내](remaining-api-guide.md)에 기록했습니다.
