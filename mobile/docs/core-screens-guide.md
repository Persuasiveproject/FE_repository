# 영업중 핵심 화면 개발 안내

작업일: 2026-11-08. 브랜치: `feat/core-screens`.

> 토론 주제 카드·업/다운보트·가로 필터·답글 펼치기·신고 버튼의 후속 변경은 [토론 UI 수정 안내](discussion-ui-guide.md)에 정리했습니다.

## A. 이번에 만든 것

로그인·가입 폼 → 토론 만들기 → 입장 선택 → 의견·답글 → 입장 변경 → 종료 결과 → 참여 목록·마이페이지로 이어지는 핵심 흐름을 만들었습니다.
임시 화면을 실제 입력 폼과 데이터 동작으로 교체했습니다. 서버가 없어도 화면을 확인하도록 메모리 기반 데모 서비스를 연결했습니다.

현재는 **프런트엔드 데모**입니다. 실제 회원가입, 문자 발송, 카카오 로그인, AI 추론, 결제, 서버 저장은 수행하지 않습니다.
새로고침·앱 재시작 시 데모 데이터와 로그인 상태가 초기화됩니다. 로그아웃 후 다시 데모 로그인하면 같은 실행 중의 계정을 사용합니다.

홈의 검색·인기·추천 배치, 시스템 글꼴, 로고의 크기 28·굵기 800·색상 #1F2937, 기존 툴바의 디자인과 항목은 유지했습니다.
홈과 목록에 다시 돌아올 때 새 토론·참여 인원 등을 읽도록 데이터 조회 부분만 바꿨습니다.
`app-tabs.tsx`, `app-tabs.web.tsx`, `theme.ts`, `discussion-card.tsx`, `screen-header.tsx`는 이번 작업에서 수정하지 않았습니다.

이전 홈 작업 PR #5가 아직 main에 병합되지 않아, 그 작업을 포함하는 `feat/home-foundation`의 `3b39f8a`에서 새 브랜치를 만들었습니다.
이번 PR의 기준 브랜치는 `feat/home-foundation`입니다. PR #5를 먼저 main에 병합한 뒤 이 PR의 기준을 main으로 바꾸어 최종 차이를 확인합니다.
main에 직접 Push하거나 자동으로 Merge하지 않습니다.

## B. 실행하고 살펴보기

```powershell
cd C:\dev\FE_repository\mobile
npm.cmd ci
npm.cmd start
```

웹만 실행할 때는 `npm.cmd run web -- --port 8082`를 사용합니다. 기본 모드는 `mock`이므로 서버 주소 없이도 동작합니다.

1. **마이 → 로그인 → 데모 계정으로 시작**을 누릅니다. 데모 코인 10개와 크레딧 30을 받습니다.
2. 홈 인기 카드의 토론을 열고 **입장 선택하고 참여하기**에서 찬성·반대·유보 중 하나를 고릅니다.
3. **의견 작성**으로 글을 남깁니다. 카드의 **답글 펼치기**를 누르면 답글 목록이 열리고 **이 의견에 답글 쓰기**로 반박·대댓글을 쓸 수 있습니다.
4. 다른 사람 글의 업보트·다운보트를 누릅니다. 가운데 숫자는 두 수의 차이입니다. 같은 버튼을 다시 누르면 취소되고 반대 버튼을 누르면 전환됩니다.
5. **투표 · 입장 변경**에서 입장을 바꿉니다. 최초 입장과 이미 작성한 글의 입장은 보존됩니다.
6. **참여 중**의 진행 중 목록에서 참여한 토론을 확인합니다. 종료 탭에는 `closed-demo`라는 종료 예시가 있습니다.
7. 종료 예시를 열어 **최종 통계 보기**를 누르면 최종 선택 비율과 입장 변화 흐름도를 볼 수 있습니다.
8. **만들기**에서 주제·방식 → 제목·내용 → 비용 확인의 3단계를 거쳐 게시합니다. 데모 코인 1개가 차감됩니다.
9. 생성한 토론은 목록에 추가됩니다. 작성자도 입장 선택 후 참여하도록 했습니다. 간단토론을 5분으로 만들면 종료 전후 동작을 확인할 수 있습니다.
10. 마이에서 프로필·관심 주제 수정, 코인 사용 내역, 크레딧과 배지, 로그아웃을 확인합니다.

가입 폼을 확인하려면 로그인 화면의 **가입 폼 확인하기**를 누르세요.
휴대폰 흐름은 **전화번호로 계속하기 → 01000000000 → 데모 코드 받기 → 123456**으로 확인합니다. 실제 번호나 SMS는 필요하지 않습니다.
약관 선택은 폼 동작 예시이며 실제 동의 기록이 아닙니다. 닉네임은 2~20자, 관심 주제는 최대 5개입니다.

## C. 화면 경로와 파일

`src/app`의 파일은 **주소와 화면을 연결하는 입구**입니다. 대부분 실제 화면 컴포넌트를 가져오는 한두 줄만 둡니다.
디자인·버튼·입력 로직은 `src/features`에서 수정합니다. 경로 파일에 작은 컴포넌트나 API 코드를 섞지 않도록 분리했습니다.
아래 모든 경로는 `mobile/` 기준입니다. `[id]`는 토론 ID, `[opinionId]`는 의견 ID가 들어가는 자리입니다.

| 주소 | 경로 파일 (`src/app/` 아래) | 실제 화면 (`src/features/` 아래) | 역할 |
| --- | --- | --- | --- |
| `/auth/login` | `auth/login.tsx` | `auth/login-screen.tsx` | 로그인 선택·데모 로그인·비회원 둘러보기 |
| `/auth/phone` | `auth/phone.tsx` | `auth/phone-screen.tsx` | 데모 휴대폰 코드 입력 |
| `/auth/signup` | `auth/signup.tsx` | `auth/signup-screen.tsx` | 닉네임·관심 주제·필수 확인 폼 |
| `/discussions/create` | `discussions/create.tsx` | `debates/create-screen.tsx` | 토론 생성 3단계 |
| `/discussions/[id]` | `discussions/[id].tsx` | `debates/detail-screen.tsx` | 토론 내용·의견 필터·정렬·행동 버튼 |
| `/discussions/[id]/join` | `discussions/[id]/join.tsx` | `debates/stance-screen.tsx`의 join 모드 | 첫 입장 선택 |
| `/discussions/[id]/vote` | `discussions/[id]/vote.tsx` | `debates/stance-screen.tsx`의 change 모드 | 투표·현재 입장 변경·근거 의견 선택 |
| `/discussions/[id]/opinion` | `discussions/[id]/opinion.tsx` | `opinions/compose-screen.tsx` | 의견 작성 |
| `/discussions/[id]/threads/[opinionId]` | `discussions/[id]/threads/[opinionId].tsx` | `opinions/thread-screen.tsx` | 원래 의견과 답글·반박 목록 |
| `/discussions/[id]/reply/[opinionId]` | `discussions/[id]/reply/[opinionId].tsx` | `opinions/compose-screen.tsx`의 reply 모드 | 원래 의견에 답글 작성 |
| `/discussions/[id]/results` | `discussions/[id]/results.tsx` | `debates/results-screen.tsx` | 종료 통계·최종 선택·흐름도 |
| `/discussions/[id]/summary` | `discussions/[id]/summary.tsx` | `debates/summary-screen.tsx` | 입장별 데모 요약·원문 이동 |
| `/joined` | `(tabs)/joined.tsx` | `account/joined-screen.tsx` | 진행·종료 참여 목록 |
| `/my` | `(tabs)/my.tsx` | `account/my-screen.tsx` | 프로필·코인·크레딧 메뉴·로그아웃 |
| `/account/profile` | `account/profile.tsx` | `account/profile-screen.tsx` | 닉네임·관심 주제 수정 |
| `/account/coins` | `account/coins.tsx` | `account/coins-screen.tsx` | 데모 잔액·게시 비용 내역 |
| `/account/credits` | `account/credits.tsx` | `account/credits-screen.tsx` | 현재 크레딧·배지 조회 |
| 없는 주소 | `+not-found.tsx` | 경로 파일 안의 공통 Page | 홈으로 돌아가기 |

기존 `/`, `/discussions`, `/explore`는 유지합니다. `/discussions/create`는 Stack 화면이므로 별도의 생성 탭을 추가하지 않습니다.
모바일의 기존 `create-action.tsx`는 툴바 연결용이며 실제 생성 화면으로 이동하는 역할을 그대로 유지합니다.
웹 직접 주소 진입 시에도 경로가 열리고, 이전 화면이 없는 경우 공통 뒤로 가기는 홈으로 이동합니다.

Figma에서 생성 105:495·565·623, 참여/토론 105:656·713, 의견/답글 108:263·308·343,
입장 변경 108:498, 결과 108:618, 참여 목록 108:682, 마이 108:742, 요약 108:593,
크레딧/코인 108:787·817을 확인했습니다.
[디자인 원본](https://www.figma.com/design/pTpc64rzHzMK09Hskze1M5/?node-id=0-1).
승인된 기존 글꼴·로고·툴바를 우선했습니다. 장식용 시작 애니메이션과 카카오 인증은 이번 핵심 흐름에 포함하지 않았습니다.

## D. 공통 코드와 데이터 구조

```text
src/app 경로
  → src/features 화면 (어떤 내용을 보여줄지)
    → gateway (어떤 데이터를 요청할지)
      → mock-gateway (현재: 메모리 데이터)
      → 향후 HTTP 구현 (확정된 서버 계약으로 연결)
```

| 새 파일 | 하는 일 | 수정하는 시점 |
| --- | --- | --- |
| `src/types/core.ts` | 화면용 토론·회원·입장·의견·통계·지갑 타입 | 화면에서 필요한 데이터가 늘어날 때. BE DTO와는 구분 |
| `src/services/app-gateway.ts` | 데이터 요청 목록을 정의하는 AppGateway 인터페이스와 DomainError | 새 기능의 데이터 동작을 추가할 때 |
| `src/services/mock-gateway.ts` | 데모 데이터, 권한·마감·중복 요청·코인 처리 | 데모 예시나 행동을 변경할 때 |
| `src/services/gateway.ts` | 앱 전체가 사용할 데이터 공급자 한 곳 선택 | 실제 HTTP 구현 연결 시 |
| `src/services/demo-phone.ts` | 번호 형식 검사·가짜 코드 발급/확인 | 실제 SMS 계약으로 교체 시 |
| `src/features/session/session-provider.tsx` | 앱 전체에서 같은 로그인 상태를 읽고 갱신 | 실제 세션·만료·재로그인 처리 시 |
| `src/features/core/rules.ts` | 입장 이름, 주제, 입력 길이, 생성 제한, 종료 판단 | 정책·허용 길이·주제가 바뀔 때 |
| `src/features/core/choice-group.tsx` | 입장·주제·필터 선택 버튼 묶음 | 공통 선택 UI 변경 시 |
| `src/hooks/use-focus-resource.ts` | 화면이 다시 열릴 때 조회, 로딩·실패·재시도, 늦은 응답 무시 | 조회 동작 변경 시 |
| `src/hooks/use-mutation.ts` | 게시 중 버튼 잠금, 연속 터치 방지, 오류 메시지 | 쓰기 요청 공통 처리 변경 시 |
| `src/components/page.tsx` | 안전 영역·공통 헤더·스크롤·키보드 대응·데모 표시 | 새 화면 공통 틀 변경 시 |
| `src/components/require-session.tsx` | 회원 기능에서 비회원에게 로그인 안내 | 회원 전용 화면 추가 시 감싸기 |
| `src/components/resource-content.tsx` | 로딩/오류/정상 데이터를 공통으로 표시 | 조회 화면 공통 상태 디자인 변경 시 |
| `src/components/ui/form-field.tsx` | 입력 제목·본문 입력·글자 수·오류 표시 | 공통 입력칸 변경 시 |
| `src/components/ui/content-blocks.tsx` | Heading/Body/Caption/Panel/Notice/Row | 본문·패널 공통 모양 변경 시 |
| `src/features/opinions/opinion-card.tsx` | 입장별 테두리·본문·추천·답글 버튼 | 의견 카드 변경 시 |
| `src/features/debates/transition-chart.tsx` | 인원 데이터에 따라 굵기가 바뀌는 SVG 흐름도 | 결과 도표 변경 시 |
| `tests/core-flows.test.ts` | 생성부터 결과까지 데이터 동작 자동 검사 | 동작·정책 수정 후 회귀 검사 |

기존 파일 변경의 역할:

| 파일 | 변경 내용 |
| --- | --- |
| `src/app/_layout.tsx` | 기존 Stack을 SessionProvider로 감싸 로그인 상태 공유 |
| `src/app/(tabs)/index.tsx`, `src/app/discussions/index.tsx` | 돌아왔을 때 재조회하는 훅 사용. 기존 화면 스타일·검색·카테고리 유지 |
| `src/services/discussions.ts` | 기존 홈/목록 함수의 데이터를 공통 gateway에서 읽음 |
| `src/components/ui/app-button.tsx` | 기존 기본 모양에 primary 선택 옵션과 로딩 표시 추가. 기존 사용처는 기본값 유지 |
| 기존 상세·생성·joined·my 경로 파일 | 임시 화면 대신 기능 화면 연결 |
| `.env.example` | 기본 데모 모드 명시 |
| `package.json`, `package-lock.json` | Expo 호환 `react-native-svg` 추가. 결과 흐름도를 모바일·웹에서 그리는 용도 |
| `tests/web-smoke.mjs` | 9개 → 23개 경로 HTTP/SSR·툴바 구조 검사 |
| `README.md`, `docs/backend-contract.md`, `docs/frontend-guide.md` | 새 문서 연결·기존 임시 화면 설명 갱신/기록 구분 |

## E. 자주 수정할 곳

- 화면의 순서·문구: 해당 `features/**/…-screen.tsx`를 수정합니다.
- 전체 색상·간격·글꼴: 기존 `constants/theme.ts`가 기준입니다. 승인된 홈과 툴바에도 영향이 있으니 사용처를 확인합니다.
- 카드 하나만 변경: 토론은 기존 `DiscussionCard`, 의견은 `OpinionCard`를 수정합니다.
- 입력 길이·게시 비용·생성 제한: `rules.ts`에서 공통으로 관리합니다. UI와 데모 service가 같은 검증 함수를 씁니다.
- 새로운 주소: `app`에 얇은 경로 파일을 만들고 `features` 화면을 가져옵니다. 화면 경로 추가 후 Expo를 실행해 typed routes가 갱신되게 합니다.
- API 연결: [API 연동 안내](core-api-integration.md)를 먼저 읽습니다. 화면에 fetch를 직접 넣지 않습니다.

예를 들어 의견 작성은 폼의 content 상태 → validateOpinion → useMutation → gateway.postOpinion 순서입니다.
성공하면 토론 또는 원래 의견으로 돌아가고, 해당 화면의 useFocusResource가 새 목록을 읽습니다.
입장 변경도 화면 상태와 회원 전체 상태를 섞지 않고, gateway 응답을 다시 조회해 반영합니다.

## F. 동작 규칙과 남겨 둔 범위

| 항목 | 현재 동작 |
| --- | --- |
| 비회원 | 토론·의견·종료 통계 열람 가능. 생성·참여·작성·개인 목록은 로그인 안내 |
| 토론 생성 | 제목 100자, 내용 5,000자, 간단 5~15분/끝장 72시간. 데모 비용 1코인, UTC 날짜 기준 하루 3개·동시 진행 3개 |
| 중복 처리 | 쓰기 버튼 잠금 + 같은 requestId의 게시 재시도 결과 재사용. 중복 참여도 인원을 늘리지 않음 |
| 의견·대댓글 | 1,000자, 등록 후 수정 없음. 답글은 원래 의견 한 단계에 연결. 답글의 답글은 지원하지 않음 |
| 추천·비추천 | 내 글 투표 차단, 다른 글에 취소·전환 가능. 토론 참여자만 가능 |
| 입장 | PRO/CON/NEUTRAL. 최초 입장 보존. 변경 시 version으로 오래된 요청 차단. 다른 사람의 의견을 선택 근거로 사용 가능 |
| 종료 | 시간이 끝나거나 CLOSED이면 참여·글쓰기·투표·입장 변경 차단. 결과는 종료 후만 공개 |
| AI 요약 | 기존 의견을 입장별로 뽑아 보여주는 데모. 실제 생성형 AI 요약 아님 |
| 통계 | closed-demo는 160명 예시 집계. 나머지 예시도 메모리 기반 집계. 성별·나이·지역은 데이터가 없어 표시하지 않음 |
| 코인·크레딧 | 데모 잔액·사용 내역·배지만 조회. 충전·환불·포인트 자동 지급·등급 산정은 미연결 |

하루 제한·크레딧 정책·시간·비용 등은 화면 확인용 정책입니다. 서비스 운영 정책과 서버 검증을 확정해야 합니다.
실제 계정 분리·영구 저장·약관 버전·SMS 만료/재전송·신고·차단·운영 기능·실시간 수신·자동 요약은 이번 구현에 포함하지 않았습니다.

## G. 검사와 실기기 확인

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
# 별도 터미널에서 web 서버 실행 후
$env:WEB_TEST_URL='http://localhost:8082'
npm.cmd run test:web
npx.cmd expo export --platform all --output-dir .expo/core-screens-export
```

단위 테스트는 인증 필요 여부, 프로필 검증, 중복 생성/코인 차감, 중복 참여, 의견/답글 관계,
투표 취소/전환/자기 글 금지, 입장 버전 충돌, 마감 후 쓰기 차단, 통계 합계와 API 모드 차단을 확인합니다.
HTTP 검사는 23개 경로 응답·화면 제목·홈 툴바 항목·상세 화면의 불필요한 탭 부재를 검사합니다. 실제 클릭 테스트는 아닙니다.

Windows 브라우저 도구가 현재 URL을 확인하지 못해 직접 클릭·스크린샷 검사는 중단되었습니다.
Android/iOS 번들 생성은 기기 실행 성공을 의미하지 않습니다. 아래 항목은 실제 기기에서 확인해야 합니다.

- 홈 글꼴·로고·툴바가 승인된 모습인지, 기존 검색·카테고리 필터가 유지되는지.
- 비회원 생성 → 로그인 → 생성 화면 복귀, 탭 왕복 후 참여 목록 갱신.
- 작은 화면/큰 글꼴에서 입력칸·선택 버튼·긴 제목이 잘 보이는지.
- 키보드를 연 상태에서 폼 아래 버튼을 누를 수 있는지, 안전 영역·뒤로 가기가 정상인지.
- 3단계 작성 중 이전 단계에서 입력이 유지되는지, 빠른 연속 터치로 중복 게시되지 않는지.
- 생성한 간단토론의 마감 이후 화면/서버가 쓰기를 막는지.

최종 자동 검사 결과는 [검증 기록](core-verification.md)에 남깁니다.

## H. 백엔드 담당자에게 전달할 자료

[API 연동 안내](core-api-integration.md)와 [확인된 BE 계약](backend-contract.md)을 전달하세요.
`AppGateway`의 입력·출력 타입을 기준으로 협의하면 화면을 다시 만드는 작업을 줄일 수 있습니다.
실서버 연결에는 FE의 HTTP 구현과 인증 처리를 추가하는 작업도 남아 있습니다. 환경변수만 바꾸면 실서비스가 되는 상태는 아닙니다.
