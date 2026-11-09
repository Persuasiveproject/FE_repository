# 공개 API 첫 연결 안내

> 이 문서는 공개 목록을 처음 연결한 **1단계 작업 기록**입니다.
> 이후 홈·상세·의견·답글 조회를 추가했습니다. 현재 범위와 실행 방법은 [최신 조회 안내](public-read-api-guide.md)를 확인하세요.

확인일: 2026-11-09. 작업 브랜치: `feat/public-api-integration`.
서버: <https://dev-api.yeongup.shop>. 서버에 쓰기 요청은 보내지 않았습니다.

## 1. 현재 연결한 기능

`api` 모드의 **토론 목록**에 실제 카테고리·토론 목록을 연결했습니다.
홈의 검색 버튼이나 `/discussions` 주소로 진입합니다. 홈·로고·메뉴·카드·버튼의 기존 스타일은 유지합니다.

- GET `/v1/categories`: 서버의 카테고리 ID와 이름으로 필터 버튼을 만듭니다.
- GET `/v1/debates`: 제목 검색, 카테고리, 진행/종료 필터를 서버에 전달합니다. 현재 정렬은 `latest`만 사용합니다.
- `meta.nextCursor`가 있으면 **토론 더 보기**로 다음 페이지를 읽습니다. 모든 페이지를 자동으로 요청하지 않습니다.
- 검색은 입력 후 300ms 뒤 요청합니다. 검색/필터 변경이나 화면 복귀 시 이전 목록과 cursor를 초기화합니다.
- 로딩·오류·빈 목록·다음 페이지 재시도와 중복 클릭 방지를 적용합니다.
- API 실패를 데모 데이터로 바꾸지 않습니다. 서버에 토론이 없으면 빈 목록이 정상입니다.

공개 목록 DTO에는 본문 설명과 내 입장이 없습니다. 카드 설명은 표시하지 않으며, 설명을 얻기 위한 토론별 추가 요청도 하지 않습니다.
카테고리 이름을 찾지 못하면 “분류 미확인”으로 표시합니다. 토론/카테고리 ID는 64비트 정밀도를 잃지 않도록 문자열로 유지합니다.

## 2. 실제 서버 확인 결과와 아직 안 되는 부분

| 확인한 GET | 실제 응답 | 의미 |
| --- | --- | --- |
| `/health/` | 200, status/database 모두 ok | API·DB 상태 확인 |
| `/v1/categories` | 200, categories 빈 배열 | 등록된 공개 카테고리가 현재 없음 |
| `/v1/debates` | 200, debates 빈 배열, nextCursor null | 등록된 공개 토론이 현재 없음 |
| `/v1/home` | 404 | 홈 인기·추천 미배포 |
| `/v1/debates/1` | 405 METHOD_NOT_ALLOWED | 상세 주소는 있으나 GET 미지원 |
| `/v1/me` | 401 AUTH_REQUIRED | 비로그인 접근 차단. 로그인 구현 여부를 보장하지 않음 |

확인 당시 BE develop은 `0486ea5b3b54ec34539e7a815fd02fa8126a823d`였습니다.
이는 GitHub 확인 기준이며, 실제 배포 커밋을 응답에서 확인한 것은 아닙니다.
서버 상태와 GitHub의 코드는 이후 바뀔 수 있습니다.

API 모드의 홈에는 인기·추천 준비 안내가 나오며 위 검색 버튼으로 실제 목록을 열 수 있습니다.
실제 목록 카드를 누르면 기존 상세 경로로 이동하지만, 상세·의견·참여는 현재 준비 안내만 표시합니다.
로그인은 아직 연결하지 않았습니다. API 모드는 비로그인 공개 조회만 지원하고 데모 로그인 버튼은 비활성화합니다.
토론 생성·코인 차감·의견 등록 등 쓰기 기능은 실제 서버에 연결하지 않았습니다.
기존 데모 모드에서는 전체 체험 흐름을 그대로 사용할 수 있습니다.

## 3. 실행 방법

이 작업에서는 로컬의 무시되는 `mobile/.env.local`에 다음 값을 설정했습니다.
다른 개발자는 파일이 없을 때 직접 생성합니다. 기존 개인 설정을 덮어쓰지 마세요.

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://dev-api.yeongup.shop
EXPO_PUBLIC_DATA_SOURCE=api
```

`/v1`을 서버 주소 끝에 추가하지 않습니다. 각 요청 함수의 경로에 이미 포함돼 있습니다.
`EXPO_PUBLIC_` 값은 앱에 공개되므로 비밀번호·토큰을 넣지 않습니다.

```powershell
cd C:\dev\FE_repository\mobile
npm.cmd start
```

기존 실행을 종료하고 다시 실행한 뒤 Expo 앱/브라우저를 완전히 새로고침합니다.
홈 검색 버튼에서 토론 목록을 엽니다. 현재 데이터가 비어 있어 카드가 없는 것이 정상입니다.
데모 전체 흐름으로 돌아가려면 `.env.local`의 `EXPO_PUBLIC_DATA_SOURCE=mock`으로 바꾼 뒤 다시 실행합니다.
공유하는 `.env.example`의 기본 모드는 기존처럼 `mock`입니다.

### 웹 CORS 설정 필요

실제 서버에 `Origin: http://localhost:8082`를 붙여 카테고리를 조회했을 때 `Access-Control-Allow-Origin` 헤더가 없었습니다.
따라서 PowerShell/Node에서 200이어도 브라우저의 앱에서는 응답을 읽지 못할 수 있습니다.
이는 FE에서 요청 헤더를 추가하는 것으로 해결되지 않습니다. `no-cors`로 우회해도 응답 JSON을 읽을 수 없습니다.

BE에 개발용 웹 origin(예: `http://localhost:8082`, 사용 포트가 다르면 그 주소)을 허용하도록 요청합니다.
현재 공개 GET은 쿠키 없이 호출합니다. 로그인용 CORS·쿠키·CSRF는 인증 방식 확정 후 별도로 설정해야 합니다.
모바일에서는 브라우저 CORS 규칙이 적용되지 않지만, 실제 기기 접속과 화면 동작은 별도 확인이 필요합니다.

## 4. 수정할 파일과 역할

| 파일 | 역할과 수정 시점 |
| --- | --- |
| `src/types/api.ts` | 카테고리·공개 목록 요청/응답 타입. BE 필드가 바뀌면 확인 |
| `src/services/public-api.ts` | HTTP 요청, 실제 JSON 검증, DTO→카드 변환, 페이지 중복 처리 |
| `src/features/discussions/api-list-screen.tsx` | 서버 검색·필터·페이지 조회 화면. 배치는 기존 목록 스타일 사용 |
| `src/features/discussions/category-filter.tsx` | 기존 기본 목록과 서버가 준 선택지를 모두 받을 수 있는 필터 |
| `src/app/discussions/index.tsx` | 모드에 따라 기존 데모/새 API 목록 화면을 선택 |
| `src/services/discussions.ts` | 홈 API 준비 상태를 명확히 안내. 홈 HTTP 연결은 후속 작업 |
| `src/services/gateway.ts` | API 모드 비로그인 세션, 인증·쓰기 차단 유지 |
| `src/components/discussion-card.tsx` | 서버에 없는 설명 영역만 생략. 기존 스타일 유지 |
| `src/app/(tabs)/index.tsx` | 준비 상태를 포함한 실제 오류 문구 표시 |
| `src/components/page.tsx`, `src/features/auth/login-screen.tsx` | API 모드의 제공 범위 안내와 데모 인증 진입 제한 |
| `src/features/auth/phone-screen.tsx` | 코드 발급 전 빈 문자열이 View에 들어가던 기존 렌더링 경고 수정 |
| `tests/public-api.test.ts` | 빈 응답·64비트 ID·응답 검증·검색 URL·오류·페이지 중복 검사 |
| `scripts/check-public-api.ts` | 실제 서버 공개 조회와 웹 origin 허용 헤더를 읽기 전용으로 확인 |

`api-client.ts`의 인증 가드는 그대로 유지합니다. 임의의 로그인 토큰이나 테스트 계정은 추가하지 않았습니다.
핵심 화면용 AppGateway 전체를 HTTP 구현으로 교체한 작업은 아닙니다.

## 5. 확인 명령

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run test:api
```

`test:api`는 로그인·데이터 생성 없이 서버의 공개 GET 응답을 검사합니다.
스크립트 기본 대상은 개발 API이며, 다른 서버는 `EXPO_PUBLIC_API_BASE_URL` 환경변수로 지정합니다.
Node 스크립트는 `.env.local`을 자동 로드하지 않습니다.
CORS 헤더가 없으면 주의 문구를 출력합니다. 이 명령의 통과가 브라우저·실기기 전체 검증 통과를 뜻하지는 않습니다.

실행 중인 웹의 경로·SSR 검사는 `npm.cmd run test:web`로 수행합니다. 화면 클릭 검사가 아닙니다.
서버가 현재 빈 목록이므로 실제 카드·다음 페이지는 고정 응답 단위 테스트로 검사하며,
서버에 테스트 데이터가 추가되면 브라우저/기기에서 검색·필터·페이지 경계도 다시 확인해야 합니다.

## 6. 백엔드와 다음에 맞출 항목

1. 웹 개발 origin CORS 허용과 테스트용 카테고리·공개 토론 데이터 준비.
2. 상세·참여·의견 PR #29와 홈 PR #33의 반영·배포 여부 확인.
3. 로그인 API와 인증 전달·갱신·로그아웃 방식 확정. 그 뒤 내 정보·참여 목록·쓰기 연결.
4. 의견 목록의 내 업/다운보트 상태, 익명 작성자 표시, 입장 version, 멱등성 헤더, 결과 내부 구조를 실제 응답과 대조.

API 모드에서 막힌 기능을 확인하려고 운영 인증을 우회하거나 서버 코드를 임의로 변경하지 않습니다.
연결 범위를 넓힐 때는 이 문서와 기존 [핵심 연동 안내](core-api-integration.md)를 함께 갱신합니다.

## 7. 이번 작업의 검증 기록

- TypeScript, ESLint, `git diff --check`: 통과.
- 단위 테스트: 기존 19개 + 공개 API 8개, 총 27개 통과.
- 실제 서버의 공개 카테고리·진행/종료 목록 응답을 새 FE 요청 함수와 검증기로 확인: 통과, 모두 빈 목록.
- API 모드로 Expo 웹 실행, 23개 주소의 HTTP 200·제목·SSR 구조 검사: 통과. 클릭·픽셀 비교 검사는 아님.
- Android/iOS/Web 전체 번들 생성: 통과. 결과는 무시되는 `.expo/public-api-export`에 저장.
- 웹 CORS 헤더 미설정, 실제 데이터가 있는 카드·페이지 경계, 휴대폰 실기기·인증·쓰기 통합 검증은 남아 있음.

이번 검사용 웹 서버는 종료했습니다. 기존 사용자 서버나 BE 설정은 변경하지 않았으며,
커밋·Push·PR 생성·Merge는 수행하지 않았습니다.
