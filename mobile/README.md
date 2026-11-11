# 영업중 모바일 프런트엔드

React Native / Expo SDK 58 / TypeScript / Expo Router 앱입니다. 모든 앱 개발 명령은 이 폴더에서 실행합니다.

2026-11-11: **시연용 Basic 인증과 실제 생성·게시·참여·의견·입장 변경·결과**를 연결했습니다.
카카오 로그인과는 별도입니다. [시연 로그인·검증 결과·파일 설명](docs/demo-basic-auth.md)을 먼저 확인하세요.

이어서 **AI 요약·서버 기준 시간·입장 변경 이력·알림·초안 수정**도 연결했습니다.
[사용 위치·파일 역할·서버 검사·제한 사항](docs/remaining-api-guide.md)을 확인하세요.

2026-11-09: 실제 개발 서버의 **홈·카테고리·목록·상세·의견·답글 공개 조회**를 연결했습니다.
모드 설정, 파일별 역할과 남은 기능은 [공개 조회 API 안내](docs/public-read-api-guide.md)를 확인하세요.

## 설치와 실행

Node.js 24 LTS와 npm을 기준으로 확인했습니다. PowerShell에서 npm.ps1 실행 정책 오류가 발생하면 npm.cmd를 사용하세요.

```powershell
cd C:\dev\FE_repository\mobile
npm.cmd ci
npm.cmd start
```

Expo가 안내하는 QR/에뮬레이터를 사용합니다. 웹만 실행하려면:

```powershell
npm.cmd run web -- --port 8082
```

iOS 네이티브 실행은 iOS 기기 또는 macOS 환경이 필요합니다. Windows에서 iOS 번들을 생성한 것이 실제 iOS 앱 실행을 의미하지는 않습니다.

## 주요 명령

| 명령 | 용도 |
| --- | --- |
| `npm.cmd start` | Expo 개발 서버 |
| `npm.cmd run android` | Android 환경 열기 |
| `npm.cmd run ios` | iOS 환경 열기 |
| `npm.cmd run web` | 웹 열기 |
| `npm.cmd run typecheck` | TypeScript 검사 |
| `npm.cmd run lint` | ESLint 검사 |
| `npm.cmd test` | API 계약·검색·필터·핵심 사용 흐름 테스트 |
| `npm.cmd run test:api` | 개발 서버 공개 조회·응답 형식·CORS 헤더 읽기 전용 검사 |
| `npm.cmd run test:web` | 실행 중인 localhost:8082의 27개 경로 HTTP·SSR 검사 |
| `npx.cmd expo export --platform all --output-dir .expo/check-export` | Android/iOS/Web 번들 검사 |

test:web는 브라우저에서 클릭하거나 화면을 촬영하는 테스트가 아닙니다. 다른 포트는 WEB_TEST_URL 환경변수로 지정합니다.
새 화면 파일을 추가하면 개발 서버를 실행하여 무시되는 .expo/types/router.d.ts를 자동 갱신하세요. 생성 파일을 직접 편집하지 않습니다.

## 현재 구현 범위

- HM-100 홈: 검색 진입, 인기·추천 카드, 더보기, 하단 메뉴.
- 목록: 기존 예시 토론·카테고리 필터 유지, 검색어/진행·종료 필터, 빈 상태.
- 카드: 토론 ID별 상세·입장 선택·의견·답글·추천/비추천·입장 변경으로 이동.
- 만들기: Stack의 주제/방식 → 본문 → 비용 확인 3단계. API 모드는 실제 초안 저장·수정·게시.
- 로그인·가입·휴대폰 확인: mock 데모 유지. API 모드는 시연용 Basic 로그인. SMS/카카오는 준비 중.
- 종료 결과·요약: 실제 통계·서버에 생성된 AI 요약 조회, 내 입장 이력·서버 기준 타이머 연결.
- 참여 중·마이: 실제 참여 목록·회원·크레딧·배지·알림·초안 목록·로그아웃. 프로필 수정·코인 내역은 mock에서만 사용.
- 툴바: main의 모바일 NativeTabs/웹 Expo Starter·Home·Explore·Docs 디자인을 유지하고 참여 중·만들기·마이만 추가.
- /explore: 기존 Explore 항목과 화면을 그대로 유지.
- `mock` 모드는 메모리 데이터이며 새로고침/재시작 시 초기화됩니다. `api` 모드의 게시·의견·입장 변경·초안 내용은 실제 서버에 남습니다. 인증정보와 앱이 기억하는 초안 ID 목록은 메모리 전용입니다. 실제 결제는 연결하지 않았습니다.

홈에 있던 카테고리 필터와 + 만들기 기능은 각각 검색/더보기의 목록과 하단 만들기로 옮겼습니다. 기능을 삭제하지 않았습니다.

## 구조

```text
src/
  app/
    _layout.tsx                전체 Stack·테마·세션 공유
    (tabs)/
      _layout.tsx              공통 탭 연결
      index.tsx                HM-100 홈
      joined.tsx / my.tsx      참여 목록·마이 경로
      explore.tsx              보존된 예제
    discussions/
      index.tsx                검색·목록·필터
      [id].tsx / create.tsx    상세·생성 경로
      [id]/                   입장·의견·답글·요약·결과 경로
    auth/                     로그인·휴대폰·가입 경로
    account/                  프로필·코인·크레딧 경로
  components/                  카드·헤더·상태·탭·임시 화면
    ui/app-button.tsx          공통 버튼
  constants/theme.ts           Expo 토큰과 영업중 토큰 중앙 관리
  features/discussions/        Mock·필터 로직·카테고리 UI
  features/auth/               로그인·가입 폼
  features/debates/            토론 생성·상세·입장·요약·결과
  features/opinions/           의견 카드·작성·답글
  features/account/            참여 목록·마이·프로필·내역
  features/session/            공통 로그인 상태
  features/core/               공통 입력 규칙·선택 UI
  hooks/use-resource.ts        조회 상태·오류·재시도
  hooks/use-focus-resource.ts  화면 복귀 시 재조회
  hooks/use-mutation.ts        쓰기 중 잠금·오류 처리
  services/                    데이터 공급과 API 요청
  types/                       화면 타입 / BE 응답 타입
assets/fonts/                  Noto Sans KR 및 OFL 라이선스
assets/icons/                  Figma 원본 SVG 4개
tests/                         단위·HTTP 검사
docs/                          파일별 설명·BE 계약
```

## 환경변수와 API

`.env.example`를 `.env.local`로 복사하여 서버 origin을 설정합니다. Mock 실행에는 필요하지 않습니다.

```dotenv
EXPO_PUBLIC_DATA_SOURCE=mock
EXPO_PUBLIC_API_BASE_URL=https://dev-api.yeongup.shop
```

위 주소는 팀 개발 서버입니다. 공개 환경변수에 비밀값을 저장하지 마세요.
`api` 모드에서는 홈·토론·의견·답글 공개 조회가 연결됩니다. 웹 CORS 설정과 서버 테스트 데이터 준비가 필요합니다.
서버에서 실제로 확인한 경로, 인증 미확정 부분, 응답 타입은 [BE 계약 문서](docs/backend-contract.md)를 확인하세요.

API 연동 시 수정 위치는 다음과 같습니다.

1. `api-client.ts`: 주소·공통 요청·오류·인증.
2. `types/api.ts`: 확인된 BE 응답 구조.
3. `services/app-gateway.ts`와 `types/core.ts`: 화면이 요구하는 기능·데이터 계약.
4. 실제 HTTP gateway를 구현하고 `services/gateway.ts`에서 연결합니다. 홈/목록은 `services/discussions.ts`도 확인합니다.
5. 화면은 같은 gateway와 카드 Props를 사용하도록 유지합니다. 인증 전용 폼은 실제 계약에 맞춰 연결합니다.

## 공통 컴포넌트 사용

| 컴포넌트 | Props | 사용처·주의 |
| --- | --- | --- |
| DiscussionCard | discussion, onPress, recommended? | 카드 자체는 API/화면 이동을 결정하지 않음 |
| AppButton | label, onPress, disabled?, selected?, loading?, variant? | 기본 모양 유지, primary/로딩 선택 가능 |
| ScreenHeader | title, back? | 홈·목록 헤더 |
| ResourceState | kind, message?, onRetry? | loading/error/empty. error일 때 재시도 가능 |
| CategoryFilter | value, onChange | 선택 상태는 화면에서 관리 |
| NavigationPlaceholder | title, description? | 기능 미구현 화면 |

```tsx
<DiscussionCard
  discussion={item}
  onPress={() => router.navigate({
    pathname: '/discussions/[id]',
    params: { id: String(item.id) },
  })}
/>
```

Figma가 바뀌면 먼저 `theme.ts`의 AppColors/AppTypography/AppSpacing/AppRadius/AppSurfaces를 확인합니다.
배치만 바뀌면 화면을, 카드 모양이 바뀌면 DiscussionCard를 수정합니다.
글꼴은 main과 같은 시스템 기본 글꼴을 사용합니다. 기존 Noto Sans KR 파일과 라이선스는 보존했지만 불러오지 않습니다.
홈의 영업중 로고는 main과 같은 28 크기·800 굵기·#1F2937 색상입니다. 홈의 검색·인기·추천 구성은 유지합니다.
Figma의 9:41·다이내믹 아일랜드는 기기 시스템 영역이므로 가짜 UI로 그리지 않고 SafeArea로 처리합니다.

## 협업 규칙

- 수정 전 `git status`와 현재 브랜치를 확인합니다.
- main 최신화 후 별도 브랜치에서 작업합니다. 미커밋 작업은 먼저 보존하세요.
- 공통 토큰·Props를 변경할 때는 다른 사용처도 검사합니다.
- 컴포넌트명은 PascalCase, 일반 함수는 camelCase, 파일명은 kebab-case를 사용합니다.
- API 요청을 UI에 직접 작성하지 않습니다. DTO와 화면 타입을 구분합니다.
- 검사 결과를 PR에 적고, 직접 main에 Push/Merge하지 않습니다.

기존 reset-project 스크립트는 보존했습니다. 기존 앱을 example로 이동시키므로 일상 개발에서는 실행하지 마세요.

## 검증의 한계

자동 검사는 실제 기기의 터치·스와이프·글꼴 표시·접근성·키보드 동작을 보장하지 않습니다.
브라우저 자동화는 도구가 현재 URL을 확인하지 못해 중단되어 Figma와 실제 화면의 육안 비교는 미완료입니다.
ESLint에서 기존 Expo 웹 hydration 훅 한 파일의 set-state-in-effect 규칙은 예외로 두었습니다. 신규 데이터 훅에는 예외가 없습니다.
npm 설치 결과 moderate 12건이 보고되었습니다. 강제 버전 변경은 하지 않았으며, 별도 의존성 점검이 필요합니다.

[상세 변경 설명과 PR 안내](docs/frontend-guide.md)

[핵심 화면별 코드·수정 방법·실행 순서](docs/core-screens-guide.md) · [핵심 API 연동 안내](docs/core-api-integration.md) · [최종 검증 기록](docs/core-verification.md)
