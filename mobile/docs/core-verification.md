# 핵심 화면 검증 기록

검사일: 2026-11-08. 브랜치: `feat/core-screens`. 로컬 Windows / Node.js 24 / Expo SDK 58.

| 검사 | 결과 | 확인한 범위 |
| --- | --- | --- |
| `npm.cmd run typecheck` | 통과 | TypeScript·Expo Router 경로 타입 |
| `npm.cmd run lint` | 통과 | ESLint 오류·경고 없음 |
| `npm.cmd test` | 19개 통과 | 기존 기반 7개 + 핵심 데이터 흐름 12개 |
| `WEB_TEST_URL=http://localhost:8087 npm.cmd run test:web` | 23개 통과 | HTTP 200·SSR 화면 제목·홈 툴바·상세 탭 중복 부재 |
| `npx.cmd expo export --platform all --output-dir .expo/core-screens-export` | 통과 | Android/iOS Hermes 번들·웹 클라이언트/서버 번들 생성 |
| `git diff --check` | 통과 | diff 공백 오류 없음 |
| 홈·툴바·공통 디자인 파일 diff 확인 | 유지 확인 | 홈/목록은 조회 훅 변경만. 실제 app-tabs·theme·ScreenHeader·DiscussionCard 변경 없음 |
| 브라우저 직접 클릭·스크린샷 | 미완료 | Computer Use가 Windows 현재 URL을 확인하지 못해 중단 |
| Android/iOS 기기 실행 | 미수행 | 번들 검사와 기기 실행은 별도 |
| 실제 BE 로그인·API 통합 | 미수행 | 현재 메모리 데모. 실서버 연결 코드·인증 계약 필요 |

검사 산출물 `.expo/core-screens-export`는 Git 제외 대상입니다. 네이티브 프로젝트 폴더는 만들지 않았습니다.
테스트 실행 시 Node의 MODULE_TYPELESS_PACKAGE_JSON 안내와 번들 생성 시 NO_COLOR/FORCE_COLOR 안내가 나왔으나 검사는 성공했습니다.
이 안내를 없애기 위해 기존 Expo 프로젝트의 모듈 설정이나 개발 환경을 바꾸지는 않았습니다.
패키지 설치에서 moderate 12건이 보고되었습니다. 강제 의존성 업데이트는 이번 화면 구현에 포함하지 않았습니다.

## 단위 테스트에서 확인한 행동

1. 비회원의 조회는 허용하고 게시·참여·개인 목록·지갑은 차단.
2. 가입/프로필 검증·trim·로그아웃 후 접근 차단.
3. 생성 재시도의 멱등성·코인 1회 차감·지갑 내역·생성 수 제한.
4. 중복 참여 인원 보존·의견 재시도·답글 관계·작성 당시 입장 보존.
5. 미참여 작성·빈 글·다른 토론 부모·과도한 답글 깊이 차단.
6. 추천/비추천 전환·취소·자기 글 투표 차단.
7. 입장 변경 버전 충돌·자기 글 근거·동일 입장 차단.
8. 마감 후 참여·작성·입장 변경·투표 차단과 종료 목록 반영.
9. 진행 중 결과 비공개·종료 예시 입장/흐름/변경 인원 합계.
10. API 미연결 모드의 오류 처리. Mock으로 자동 대체하지 않음.
11. 기존 참여자가 있는 예시 토론 마감 후 최종 선택 합계.
12. 입력 길이·시간 범위·관심 주제 검증.

위 결과는 service 동작과 번들·경로 검사의 결과입니다. 실제 터치·뒤로 가기·키보드·폰트·SVG 표시·접근성·네트워크 지연 상황의 확인은
[화면 안내의 실기기 체크 항목](core-screens-guide.md#g-검사와-실기기-확인)으로 진행합니다.
