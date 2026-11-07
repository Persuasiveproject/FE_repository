# 영업중 HM-100 홈 및 프런트엔드 기반 개선

> 후속 수정: 홈의 검색·인기·추천 구성은 유지하고, 글꼴은 시스템 기본으로 변경했습니다.
> 홈 로고는 main의 28 크기·800 굵기·#1F2937로 복원했습니다.
> 툴바는 main의 모바일 NativeTabs와 웹 Expo Starter·Home·Explore·Docs 코드/스타일을 복원하고 참여 중·만들기·마이만 추가했습니다.
> 모바일 create-action은 NativeTabs 항목 연결용 경로이며, 실제 생성 기능은 기존 /discussions/create를 사용합니다.
> 아래 A~I는 최초 구현 기록입니다. 현재 툴바는 app-tabs.tsx / app-tabs.web.tsx가 직접 담당합니다.

작업일: 2026-11-08. 작업 브랜치: `feat/home-foundation`.
FE 기준 commit: `4099d0896ef03d2c41d168e3b9b3f29f2df49bea` (GitHub main과 일치).
작업 전 `feat/navigation`의 미커밋 화면 이동 구현을 보존한 채 새 브랜치를 만들었습니다.
이 문서는 commit·Push·PR 생성 전 검토용으로 작성했습니다. 실제 진행 상태는 Git/GitHub에서 확인합니다.

## A. 전체 작업 요약

[Figma HM-100 · 영업중](https://www.figma.com/design/pTpc64rzHzMK09Hskze1M5/?node-id=105-212)을 기준으로
검색 진입, 인기 카드, 더보기, 추천 카드, 원본 아이콘을 사용하는 하단 메뉴를 구현했습니다.
색상·글꼴·간격·모서리·버튼·카드 규칙을 기존 theme.ts에 모았습니다.

기존 토론 카드의 Props 방식과 ID별 상세/생성 이동은 유지했습니다.
홈의 카테고리 필터와 예시 3개는 목록으로 이동했으며 검색어·진행/종료 필터를 추가했습니다.
만들기는 하단 버튼에서 기존 생성 화면을 엽니다. 생성 화면이 탭으로 추가되지 않습니다.
참여 중·마이는 준비 중 화면이며 실제 로그인·참여 목록을 구현한 것은 아닙니다.

화면 → service → Mock의 데이터 경로를 분리했습니다. API 공통 요청·오류·인증 가드와 확인된 참여 목록 DTO를 준비했습니다.
BE develop에는 홈/목록/검색/상세/로그인 API 연결이 아직 없으므로 실제 서버처럼 가정하지 않았습니다.

Figma의 기기 시간·다이내믹 아일랜드는 OS 영역으로 처리합니다. 고정된 9:41이나 가짜 노치를 화면에 그리지 않았습니다.
넓은 화면에서는 본문 최대 폭 600, 작은 화면에서는 가용 폭과 스크롤을 사용합니다.
원본 폰트는 [Google Fonts Noto Sans KR](https://github.com/google/fonts/tree/main/ofl/notosanskr)이며 OFL을 함께 보관합니다.
가변 글꼴 사용은 [Expo SDK 58 글꼴 안내](https://docs.expo.dev/develop/user-interface/fonts/)에 맞춰 weight 100~900으로 등록했습니다.

## B. 새롭게 생성한 파일 목록

다음 표는 이번 요청에서 새로 만든 모든 추적 대상 파일입니다. 링크는 전체 로컬 경로입니다.
`.expo/`의 baseline·번들·캐시는 검사 산출물이며 Git에서 제외됩니다.

| 파일·전체 경로 | 만든 이유 | 역할·관계·향후 수정 시점 |
| --- | --- | --- |
| [.env.example](/C:/dev/FE_repository/mobile/.env.example)<br>`C:\dev\FE_repository\mobile\.env.example` | 서버 공개 주소 예시 | EXPO_PUBLIC_API_BASE_URL; 실서버 origin 확정 시 설정. Mock에는 불필요. |
| [eslint.config.js](/C:/dev/FE_repository/mobile/eslint.config.js)<br>`C:\dev\FE_repository\mobile\eslint.config.js` | 공통 코드 검사 | Expo flat config. 기존 hydration 훅의 단일 규칙만 예외; 규칙 합의 시 수정. |
| [NotoSansKR.ttf](/C:/dev/FE_repository/mobile/assets/fonts/NotoSansKR.ttf)<br>`C:\dev\FE_repository\mobile\assets\fonts\NotoSansKR.ttf` | Figma 글꼴 | 가변 글꼴 100~900. root useFonts와 theme AppTypography가 사용. 폰트 변경 시 교체. |
| [OFL.txt](/C:/dev/FE_repository/mobile/assets/fonts/OFL.txt)<br>`C:\dev\FE_repository\mobile\assets\fonts\OFL.txt` | 글꼴 라이선스 | Noto Sans KR 배포 조건. 글꼴과 함께 보존. |
| [home.svg](/C:/dev/FE_repository/mobile/assets/icons/home.svg)<br>`C:\dev\FE_repository\mobile\assets\icons\home.svg` | 홈 아이콘 | Figma 170:244 원본 24×24. home-tabs에서 사용. |
| [joined.svg](/C:/dev/FE_repository/mobile/assets/icons/joined.svg)<br>`C:\dev\FE_repository\mobile\assets\icons\joined.svg` | 참여 중 아이콘 | Figma 170:247 원본 24×24. home-tabs에서 사용. |
| [create.svg](/C:/dev/FE_repository/mobile/assets/icons/create.svg)<br>`C:\dev\FE_repository\mobile\assets\icons\create.svg` | 만들기 아이콘 | Figma 170:252 원본 24×24. home-tabs에서 사용. |
| [profile.svg](/C:/dev/FE_repository/mobile/assets/icons/profile.svg)<br>`C:\dev\FE_repository\mobile\assets\icons\profile.svg` | 마이 아이콘 | Figma 170:257 원본 24×24. home-tabs에서 사용. |
| [joined.tsx](/C:/dev/FE_repository/mobile/src/app/(tabs)/joined.tsx)<br>`C:\dev\FE_repository\mobile\src\app\(tabs)\joined.tsx` | 참여 중 임시 탭 | JoinedScreen → NavigationPlaceholder. 실제 인증·참여 목록을 붙일 때 수정. |
| [my.tsx](/C:/dev/FE_repository/mobile/src/app/(tabs)/my.tsx)<br>`C:\dev\FE_repository\mobile\src\app\(tabs)\my.tsx` | 마이 임시 탭 | MyScreen → NavigationPlaceholder. 로그인·내 정보 구현 시 수정. |
| [index.tsx](/C:/dev/FE_repository/mobile/src/app/discussions/index.tsx)<br>`C:\dev\FE_repository\mobile\src\app\discussions\index.tsx` | 검색·목록 화면 | DiscussionListScreen; query/category/status 상태를 관리하고 getDiscussions → filterDiscussions → 카드 렌더링. 실제 검색 API 확정 시 service와 함께 수정. |
| [home-tabs.tsx](/C:/dev/FE_repository/mobile/src/components/home-tabs.tsx)<br>`C:\dev\FE_repository\mobile\src\components\home-tabs.tsx` | 공통 하단 메뉴 | HomeTabs·MenuButton. TabTrigger 3개와 Stack 생성 버튼 1개. safe area·키보드 focus용 ref·원본 SVG 연결. 메뉴 디자인 변경 시 수정. |
| [resource-state.tsx](/C:/dev/FE_repository/mobile/src/components/resource-state.tsx)<br>`C:\dev\FE_repository\mobile\src\components\resource-state.tsx` | 조회 상태 공통 UI | ResourceState(kind, message?, onRetry?). 로딩/오류/빈 목록; 재시도는 화면에서 전달. |
| [screen-header.tsx](/C:/dev/FE_repository/mobile/src/components/screen-header.tsx)<br>`C:\dev\FE_repository\mobile\src\components\screen-header.tsx` | 공통 헤더 | ScreenHeader(title, back?). 이전 화면 없으면 /로 replace. 헤더 배치·이동 정책 변경 시 수정. |
| [app-button.tsx](/C:/dev/FE_repository/mobile/src/components/ui/app-button.tsx)<br>`C:\dev\FE_repository\mobile\src\components\ui\app-button.tsx` | 공통 버튼 | AppButton(label, onPress, disabled?, selected?). 검색 진입·필터·재시도에서 사용. theme의 버튼 토큰 사용. |
| [category-filter.tsx](/C:/dev/FE_repository/mobile/src/features/discussions/category-filter.tsx)<br>`C:\dev\FE_repository\mobile\src\features\discussions\category-filter.tsx` | 카테고리 선택 UI | CategoryFilter(value, onChange). 값은 화면에서 관리. 항목은 filter-discussions에서 공유. |
| [filter-discussions.ts](/C:/dev/FE_repository/mobile/src/features/discussions/filter-discussions.ts)<br>`C:\dev\FE_repository\mobile\src\features\discussions\filter-discussions.ts` | 순수 필터 로직 | filterDiscussions와 discussionCategories. 검색/카테고리/상태를 함께 적용. 필터 정책 변경 시 테스트와 함께 수정. |
| [mock-discussions.ts](/C:/dev/FE_repository/mobile/src/features/discussions/mock-discussions.ts)<br>`C:\dev\FE_repository\mobile\src\features\discussions\mock-discussions.ts` | Mock 데이터 | 기존 ID 1~3 보존 + Figma 예시 ai-class. createMockHomeFeed는 독립 복사본으로 인기/추천을 반환. 실제 집계·개인화 아님. |
| [use-resource.ts](/C:/dev/FE_repository/mobile/src/hooks/use-resource.ts)<br>`C:\dev\FE_repository\mobile\src\hooks\use-resource.ts` | 조회 생명주기 | useResource(loader) → resource/retry. loading/error/success 구분; 언마운트·이전 요청 결과 무시. 네트워크 자체 취소는 service의 signal 연동이 추가로 필요. |
| [api-client.ts](/C:/dev/FE_repository/mobile/src/services/api-client.ts)<br>`C:\dev\FE_repository\mobile\src\services\api-client.ts` | 공통 API 기반 | apiRequest<T>·ApiError. URL/JSON/네트워크/서버 오류를 처리. auth required는 미설정 인증을 차단. 로그인 방식 합의 후 수정. |
| [discussions.ts](/C:/dev/FE_repository/mobile/src/services/discussions.ts)<br>`C:\dev\FE_repository\mobile\src\services\discussions.ts` | 화면용 데이터 공급 | getHomeFeed/getDiscussions. 현재 Mock을 반환하며 UI에서 데이터 출처를 숨김. 실제 홈/목록 API 확정 시 내부 교체. |
| [joined-debates.ts](/C:/dev/FE_repository/mobile/src/services/joined-debates.ts)<br>`C:\dev\FE_repository\mobile\src\services\joined-debates.ts` | 확인된 참여 목록 API 준비 | getJoinedDebates(query, signal). /v1/me/debates의 status/cursor를 구성. 현재 인증 가드로 차단되며 화면에는 미연결. |
| [api.ts](/C:/dev/FE_repository/mobile/src/types/api.ts)<br>`C:\dev\FE_repository\mobile\src\types\api.ts` | BE 요청·응답 타입 | JoinedDebatesQuery/JoinedDebatesResponse/JoinedDebateDto/ApiErrorBody. develop serializer 계약이 바뀌면 수정. |
| [discussion.ts](/C:/dev/FE_repository/mobile/src/types/discussion.ts)<br>`C:\dev\FE_repository\mobile\src\types\discussion.ts` | UI 데이터 타입 | Discussion/HomeFeed. description·category 이름 등 화면 요구를 표현하며 BE DTO와 분리. 카드 데이터가 달라질 때 수정. |
| [foundation.test.ts](/C:/dev/FE_repository/mobile/tests/foundation.test.ts)<br>`C:\dev\FE_repository\mobile\tests\foundation.test.ts` | 7개 단위 테스트 | 기존 ID·필터·Mock 복사·API 설정/인증/JSON/오류/취소 검사. fetch는 Mock이며 실서버를 호출하지 않음. |
| [web-smoke.mjs](/C:/dev/FE_repository/mobile/tests/web-smoke.mjs)<br>`C:\dev\FE_repository\mobile\tests\web-smoke.mjs` | 웹 HTTP 검사 | 서버 실행 후 9개 주소·제목·탭 분리·SVG 파일/슬롯을 검사. 브라우저 클릭·이미지 최종 표시 검사는 아님. |
| [backend-contract.md](/C:/dev/FE_repository/mobile/docs/backend-contract.md)<br>`C:\dev\FE_repository\mobile\docs\backend-contract.md` | BE 조사 기록 | 조회 기준 commit·경로·인증·DTO·미구현을 구분. BE 계약 변경 시 먼저 갱신. |
| [frontend-guide.md](/C:/dev/FE_repository/mobile/docs/frontend-guide.md)<br>`C:\dev\FE_repository\mobile\docs\frontend-guide.md` | 이번 작업 설명서 | A~I 작업 내용·파일 관계·변경 전후·테스트·Git/PR 초안. 이번 결과를 팀원과 검토할 때 사용. |

아래 파일은 이번 요청 전에 이미 작업 트리에 있던 미커밋 화면 이동 코드입니다. Git에서는 A로 보이지만 이번에 새로 설계한 것은 아닙니다.

- [mobile/src/app/(tabs)/_layout.tsx](/C:/dev/FE_repository/mobile/src/app/(tabs)/_layout.tsx): 이전 작업에서 만든 미커밋 파일 유지. AppTabs 연결.
- [mobile/src/app/discussions/[id].tsx](/C:/dev/FE_repository/mobile/src/app/discussions/[id].tsx): 이전 작업 유지. useLocalSearchParams의 id를 임시 제목에 표시.
- [mobile/src/app/discussions/create.tsx](/C:/dev/FE_repository/mobile/src/app/discussions/create.tsx): 이전 작업 유지. 생성 임시 화면.
- [mobile/src/components/navigation-placeholder.tsx](/C:/dev/FE_repository/mobile/src/components/navigation-placeholder.tsx): 이전 미커밋 파일 개선. 선택 description Props로 미구현 상태 안내 추가.

## C. 수정한 기존 파일 목록

| 파일 (C:\dev\FE_repository 기준) | 변경 전 → 변경 후 | 이유·영향·수정 시 주의 |
| --- | --- | --- |
| README.md | 저장소 이름만 표시 → 앱/개발/BE 문서 진입점 | 팀원이 앱 위치를 찾기 쉽게 함 |
| mobile/README.md | Expo 기본 안내 → 설치·명령·구조·컴포넌트 Props·API·협업 가이드 | reset 스크립트는 보존; 일상 개발에서는 실행하지 않음 |
| mobile/package.json | 시작/lint만 → typecheck/test/test:web 추가, 검사 도구 추가 | 앱 런타임 라이브러리 추가 없음. Node 24 기준 |
| mobile/package-lock.json | 기존 잠금 → ESLint/타입 및 하위 개발 도구 잠금 반영 | 기존 패키지 버전 변경은 @types/node 26→24 및 undici-types 8→7뿐; 기존 앱 런타임 버전 유지 |
| mobile/tsconfig.json | strict/alias → Node·React 타입과 테스트 TS 확장자 허용 추가 | strict 유지. 테스트도 tsc에 포함 |
| mobile/src/app/_layout.tsx | 이전 작업의 Stack·ThemeProvider → 폰트 로딩과 목록 화면 추가 | 기존 상세/생성 Stack 유지. 폰트 대기 후 스플래시 실행 |
| mobile/src/app/(tabs)/index.tsx | 임시 홈 목록/로컬 데이터 → HM-100 구성, service/useResource 사용 | 기존 카드·이동 재사용. 필터/Mock 직접 선언과 중복 카드 스타일 제거 |
| mobile/src/components/app-tabs.tsx | NativeTabs의 Home/Explore → 공통 HomeTabs 재노출 | Figma 하단 메뉴를 플랫폼 공통으로 표현 |
| mobile/src/components/app-tabs.web.tsx | Expo Starter/Docs/Home/Explore 웹 메뉴 → 공통 HomeTabs 재노출 | 중복 구현 제거. 원래 파일 경로는 유지 |
| mobile/src/components/discussion-card.tsx | 타입·색상·폰트 개별 관리 → 공통 타입/토큰, kind/status/opinionCount/recommended 표시 | 기존 discussion/onPress 사용법 유지. 타입 import 호환을 위해 Discussion 재export |
| mobile/src/constants/theme.ts | 임시 AppColors → Figma AppColors 및 AppTypography/AppSpacing/AppRadius/AppLayout/AppSurfaces | Expo의 기존 Colors/Fonts/Spacing은 예제 호환을 위해 유지 |

이전 미커밋 파일 `navigation-placeholder.tsx`에도 선택 설명 Props를 추가했습니다.
프로젝트에서 필요한 기능이 바뀌면 해당 화면/service를 수정하고, 공통 토큰·Props 변경 시 모든 사용처를 검사해야 합니다.

### 핵심 변경 전후 1: 화면에 있던 데이터 분리

이전 홈:

```tsx
const discussions = [/* 예시 데이터 */];
const filteredDiscussions = discussions.filter(/* 카테고리 */);
```

현재 홈:

```tsx
const { resource, retry } = useResource(getHomeFeed);
```

현재 목록:

```tsx
const { resource, retry } = useResource(getDiscussions);
const items = resource.status === 'success'
  ? filterDiscussions(resource.data, query, category, status)
  : [];
```

서비스가 데이터 출처를 담당하므로 실제 API가 나와도 화면 전체를 다시 작성할 필요가 없습니다.

### 핵심 변경 전후 2: 스타일 중앙 관리

이전 카드:

```tsx
card: { padding: 18, borderRadius: 14, borderColor: AppColors.border }
```

현재 카드:

```tsx
card: { ...AppSurfaces.card }
title: { ...AppTypography.heading, color: AppColors.text }
```

Figma에서 카드 모서리나 간격이 바뀌면 theme.ts를 먼저 확인합니다.

### 핵심 변경 전후 3: 하단 메뉴 중복 제거

이전: app-tabs.tsx는 NativeTabs, app-tabs.web.tsx는 별도 웹 메뉴였습니다.
현재 두 파일 모두:

```tsx
export { default } from './home-tabs';
```

HomeTabs는 홈/참여 중/마이의 TabTrigger와 별도의 만들기 Pressable을 구성합니다.
TabList의 직접 자식 구조와 StyleSheet.flatten은 Expo Router의 Slot 요구를 충족합니다.
MenuButton은 React Native Pressable에 맞는 ref 타입으로 focus 전달을 유지합니다.

## D. 삭제하거나 이동한 파일

실제 기능 파일을 없앤 것은 없습니다.

- 이전 화면 이동 작업에서 `src/app/index.tsx → src/app/(tabs)/index.tsx`로 이동했습니다. 이번에는 이동한 홈을 수정했습니다.
- 이전 작업에서 `src/app/explore.tsx → src/app/(tabs)/explore.tsx`로 이동했으며 내용은 그대로입니다.
- 원래 `/explore` URL은 보존했지만 HM-100 메뉴에는 표시하지 않습니다.
- 옛 홈의 쓰이지 않는 카드/notice 스타일과 임시 안내 상태는 실제 이동·공통 카드로 대체되어 정리했습니다.
- 기존 Expo 예제 컴포넌트·이미지·스플래시·reset 스크립트는 보존했습니다.

작성 시점에 Git에서 기존 화면이 D, 새 위치가 ??로 표시된 것은 미스테이징 이동 표현입니다. 스테이징 후에는 Git의 유사도 판단에 따라 R로 표시될 수 있습니다.

## E. 프로젝트 구조 설명

```text
FE_repository/
├── README.md
└── mobile/
    ├── .env.example
    ├── package.json / package-lock.json / tsconfig.json / eslint.config.js
    ├── assets/
    │   ├── fonts/             글꼴·라이선스
    │   ├── icons/             Figma SVG
    │   └── images/            기존 이미지 보존
    ├── docs/                  개발·BE 계약 문서
    ├── tests/                 단위·HTTP 검사
    └── src/
        ├── app/
        │   ├── _layout.tsx    전체 Stack·글꼴·테마
        │   ├── (tabs)/        홈·참여 중·마이·기존 Explore
        │   └── discussions/   목록·[id]·create
        ├── components/        화면 간 공통 UI
        │   └── ui/            AppButton·기존 Collapsible
        ├── constants/         기존 theme.ts에 디자인 토큰 통합
        ├── features/
        │   └── discussions/   토론 Mock·필터·카테고리 UI
        ├── hooks/             기존 훅·useResource
        ├── services/          API·데이터 공급
        └── types/             화면 모델·BE DTO
```

빈 utils 폴더나 쓸모없는 구조를 만들지 않았습니다.

## F. 실제 앱 작동 원리

1. package.json의 main인 expo-router/entry가 Router를 시작합니다.
2. src/app/_layout.tsx가 글꼴과 테마·스플래시·Stack을 준비합니다.
3. (tabs)/_layout.tsx가 플랫폼별 app-tabs 파일을 불러오고, 두 파일은 같은 HomeTabs를 사용합니다.
4. /는 (tabs)/index.tsx입니다. ScreenHeader, AppButton, DiscussionCard를 import하여 배치합니다.
5. 홈은 useResource(getHomeFeed)로 데이터를 요청합니다. service는 현재 Mock 인기/추천을 반환합니다.
6. 카드의 onPress → router.navigate({ pathname: '/discussions/[id]', params: { id } }) → [id].tsx의 useLocalSearchParams로 전달됩니다.
7. 검색/더보기 → /discussions → query/category/status 상태로 목록을 필터링합니다.
8. 만들기 → /discussions/create. 이전 화면이 있으면 back, 없으면 replace('/')로 복귀합니다.
9. 참여 중·마이 메뉴는 준비 중 화면입니다. 서버에 로그인했다고 가장하지 않습니다.
10. 실제 홈 API가 나오면 types/api.ts에 계약을 추가하고 services/discussions.ts에서 요청·DTO 변환을 구현합니다. 컴포넌트에 fetch를 넣지 않습니다.
11. 인증을 연결할 때는 api-client.ts의 auth 가드를 실제 로그인 정책으로 교체하고 joined-debates.ts를 해당 화면에 연결합니다.

useResource의 resource는 loading/error/success 중 하나입니다. 성공했어도 배열이 비어 있으면 ResourceState empty를 표시합니다.
오류의 다시 시도는 retry가 요청 횟수 상태를 변경하여 loader를 다시 실행합니다.
페이지 이동 후 끝난 이전 요청의 결과는 무시합니다.

## G. 테스트 결과

| 검사 | 결과 | 한계 |
| --- | --- | --- |
| TypeScript | 통과 | 생성된 Router 타입 포함 |
| ESLint | 통과 | 기존 use-color-scheme.web.ts의 hydration 규칙 한 개는 파일 단위 예외 |
| npm test | 7개 통과 | fetch Mock, 실서버/실로그인 검증 아님 |
| Android/iOS/Web export | 통과 | 설치·터치·실제 기기 실행 아님 |
| 웹 HTTP/SSR smoke | 9개 경로 통과 | 클릭/스크롤/뒤로 가기 동작 검증 아님 |
| 원본 SVG | 4개 비어 있지 않음·24×24·사용처 연결 확인 | 브라우저 마운트 후 이미지 표시 육안 미검증 |
| Git diff --check | 통과 | 자동 포맷 도구를 전역 적용하지 않음 |
| 실제 브라우저·기기 육안/동작 | 미완료 | 브라우저 자동화 도구가 URL을 안전하게 판별하지 못해 중단 |

서버 실행 시 React Native DevTools 설치에 오류가 발생해 Expo의 fallback을 사용했으며 Metro·HTTP·번들은 계속 동작했습니다.
Node 테스트의 MODULE_TYPELESS_PACKAGE_JSON은 모듈 재해석 경고이며 테스트는 통과했습니다.
npm 설치에서 moderate 취약점 12건이 보고되었습니다. 기존 의존성까지 강제 변경하는 audit fix --force는 실행하지 않았습니다.
원본 글꼴 약 10MB, 실기기 글꼴/터치/키보드 및 Figma와 시각 비교는 후속 검토 대상입니다.

## H. 향후 개발 권장 순서

1. Expo Go/개발 빌드와 브라우저에서 HM-100을 Figma와 비교: 작은 화면, 큰 글꼴, 스크롤, 4개 아이콘, 상세 복귀.
2. 현재 변경을 팀원이 검토한 뒤 화면 이동/홈 변경을 적절한 커밋으로 정리하고 PR로 제출.
3. BE 담당자와 로그인 계약·배포 origin·웹 CORS·홈/목록/검색 API를 확정.
4. 로그인 및 인증 저장/갱신·만료 처리, 참여 목록 실제 연결.
5. 상세 조회·토론 생성 폼·유효성 검사.
6. 댓글/대댓글·입장/투표·마감·결과 화면을 작은 PR로 구현.
7. 실서버 오류·페이지네이션·경합·로그아웃·회귀 테스트 보강.
8. 별도 의존성 점검과 글꼴 최적화 검토.

## I. Git 변경 내역

추적 기준에서 새 파일 A 목록은 B 표와 이전 미커밋 파일 목록입니다.
실제 이동은 D 표의 두 화면이며, 원래 홈과 현재 홈 차이가 커서 Git이 R 대신 D/A로 보일 수 있습니다.
M은 C 표의 파일들과 root/mobile README입니다.
보존한 화면 이동 변경과 이번 변경이 같은 작업 트리에 포함되어 있으므로 PR diff에는 둘 다 나타납니다.
검사 산출물은 .expo 아래에 있고 커밋하지 않습니다. 실제 비밀값을 가진 .env 파일은 생성하지 않았습니다.

권장 커밋 메시지:

```text
feat: Figma 홈 화면 구현 및 토론 데이터 구조 분리
```

PR 제목:

```text
feat: 영업중 홈 UI와 공통 디자인·데이터 기반 정리
```

PR 설명 초안:

> 홈의 임시 토론 목록을 Figma HM-100의 검색·인기·추천·하단 메뉴 구성으로 변경했습니다.
> 기존 예시 데이터와 카테고리 필터는 검색/목록에서 유지하며 토론 ID별 상세와 생성 이동을 보존했습니다.
>
> 디자인 토큰을 theme.ts로 모으고 공통 카드·버튼·헤더·조회 상태를 재사용합니다.
> 화면의 데이터를 service/Mock으로 분리하고 BE develop에서 확인한 참여 목록 DTO·공통 API 오류/인증 가드를 준비했습니다.
> 홈/로그인 API는 아직 확인되지 않아 실연동하지 않았고 참여 중·마이는 임시 화면입니다.
>
> 검증: TypeScript, ESLint, 단위 테스트 7개, Android/iOS/Web export, 9개 경로 HTTP/SSR 검사 통과.
> 브라우저 자동화 제한으로 Figma 육안 비교·실제 클릭·실기기 검증은 미완료입니다.
> npm moderate 12건은 별도 검토가 필요합니다.
> 이 PR에는 이전 미커밋 화면 이동 작업도 포함됩니다.
