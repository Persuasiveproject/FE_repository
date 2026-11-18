# 의견·답글 공감/비공감 API 연동

작성일: 2026-11-18 · 작업 브랜치: `feat/opinion-reactions`.
최초 구현 기준 FE main: `93fb20b2b1e9dbc47ae52f8cefc716069c0a547b`.
PR #16 충돌 해결 시 반영한 main: `28e74c2219d33636abffca44c4a001be69de45fe` (PR #15 병합 포함).

**FE 구현은 준비했지만, 실제 개발 서버의 반응 쓰기 검증은 아직 하지 않았습니다.**
확인 당시 BE PR #49는 미병합이며, 개발 서버의 반응 경로를 인증 없이 일반 OPTIONS로 조회하면 404였습니다.
따라서 기본 설정은 OFF입니다. 배포·계약·시연 계정 검증 후 명시적으로 활성화합니다.

## 1. 먼저 확인한 저장소 상태

| 대상 | 확인 결과와 이번 작업의 처리 |
| --- | --- |
| FE main | `OpinionCard`는 위 화살표·현재 표수·아래 화살표와 오른쪽 영업/답글 배치를 사용. API 목록과 원문 카드는 `canVote=false`. mock의 투표 기능과 실제 API 기능을 구분 |
| [FE PR #10](https://github.com/Persuasiveproject/FE_repository/pull/10) | OPEN, head `9956e4290116f0dcd4c9ad69ac2df0d2e75fa898`. Bearer 기반 API client·인증 함수·공유 DTO 추가. GitHub는 현재 충돌 상태(`dirty`)로 보고. 기존 main의 Basic 인증과 기능 중복이 있어 가져오지 않음 |
| [FE PR #15](https://github.com/Persuasiveproject/FE_repository/pull/15) | 최초 검토 시 OPEN, head `e837c7980c2ac4015eab8ca2cd24f396ea770897`. 이후 main에 병합되어 PR #16과 `public-opinion-feed.tsx` 충돌 발생. 최신/공감/영업순과 20개 미만 fallback을 유지하면서 반응 카드 연결과 함께 통합 |
| [BE PR #49](https://github.com/Persuasiveproject/BE_repository/pull/49) | OPEN, 미병합. 검토한 head `72cc51c4ca0a3a898de17daaa9a11179063f908a`, base `develop`. PUT/DELETE 반응 경로와 서버 테스트가 추가됨 |
| BE develop | 확인한 SHA `83c8c97d3a924d113cf8d34525b48dba728b2477`. #49가 합쳐졌다고 가정하지 않음 |

이번 수정은 #10의 `api-client.ts`, `authenticated-api.ts`, 공유 `types/api.ts`를 건드리지 않습니다.
인증은 main의 Basic 처리를 재사용하고 반응 DTO는 별도 파일에 둡니다.
반응 처리를 `ApiOpinionCard`로 분리해 같은 파일에서 겹치는 코드를 줄였습니다.
PR #15가 main에 먼저 병합된 뒤, PR #16의 작업 브랜치에 최신 main을 반영해 충돌을 해결했습니다.
정렬 옵션·fallback 콜백과 `ApiOpinionCard` 호출·반응 안내를 모두 유지했습니다.
기존 카드가 쓰던 `useSession` 호출은 API 카드 내부에서 인증을 처리하므로 되살리지 않았습니다.
PR #10은 포함하지 않았으며, PR #16을 main에 병합하는 작업도 수행하지 않았습니다.

## 2. 확인한 BE 계약

원본: [반응 View](https://github.com/Persuasiveproject/BE_repository/blob/72cc51c4ca0a3a898de17daaa9a11179063f908a/debates/api/posts/views.py), [목록 serializer](https://github.com/Persuasiveproject/BE_repository/blob/72cc51c4ca0a3a898de17daaa9a11179063f908a/debates/api/posts/serializers.py).

### 등록·변경

`PUT /v1/posts/{postId}/reaction`

```json
{ "reaction": "UP" }
```

`DOWN`은 비공감입니다. 서버 성공 응답은 HTTP 200입니다.

```json
{
  "data": {
    "reaction": "UP",
    "upvoteCount": 8,
    "downvoteCount": 3
  }
}
```

같은 반응을 다시 PUT하면 같은 상태를 유지하며 중복으로 표수를 늘리지 않습니다.
반대 반응을 PUT하면 기존 반응이 교체됩니다. 임의의 POST 경로나 요청 필드를 추가하지 않았습니다.
응답에 postId·debateId·myReaction·updatedAt 등을 요구하지 않습니다.
reaction 불일치, 빠진 표수, 음수, 숫자 문자열은 잘못된 응답으로 처리합니다.

### 취소

`DELETE /v1/posts/{postId}/reaction`

요청 본문 없이 보내며, 성공은 **본문 없는 HTTP 204**입니다. 반응이 없어도 성공합니다.
취소 응답에는 표수가 없습니다. 기존 숫자를 1 빼서 표시하지 않고 실제 의견/답글 목록을 다시 조회합니다.
본문 의견은 해당 토론의 최신순 목록, 답글은 해당 글의 **직계 부모** thread를 조회합니다.
첫 페이지에 없으면 cursor를 따라가되 최대 50페이지까지만 확인하고, 반복 cursor나 찾지 못한 글은 오류로 안내합니다.
확인 중이거나 조회 실패 시 숫자 대신 `…`를 표시합니다. `표수 다시 확인`은 GET만 재시도하며 DELETE를 반복하지 않습니다.

### 인증과 권한

PR #49는 `IsActiveMember`를 사용하므로 **인증된 ACTIVE 회원 + 해당 토론 참여자**가 필요합니다.
설정에 인증 클래스 재정의가 없고 [DRF 기본 인증](https://www.django-rest-framework.org/api-guide/settings/#default_authentication_classes)에는 Basic/Session이 포함됩니다. 기존 FE의 HTTPS Basic 헤더와 코드상 호환됩니다.
이 판단은 코드 비교이며, 실제 배포 서버의 Basic 반응 쓰기 성공을 검증했다는 뜻은 아닙니다.
Bearer 토큰·쿠키·비밀번호 영구 저장을 추가하지 않았습니다.

| 상황 | BE 코드와 FE 처리 |
| --- | --- |
| 본인 글에 등록·변경 | `403 OWN_POST_REACTION`. 익명 번호로 FE에서도 막고 서버 오류도 안내 |
| 미참여자 | `403 NOT_PARTICIPANT`. 먼저 참여하라는 안내 |
| 비활성 회원/권한 부족 | 403. 실제 오류 안내 |
| 마감 | `409 DEBATE_NOT_OPEN`. 등록·변경·취소 모두 막음. 같은 토론의 다른 카드도 반응 차단 |
| 삭제/비공개/없는 글 | `404 POST_NOT_FOUND`. 더 이상 공개되지 않는다는 안내 |
| 잘못된 반응 | `400 VALIDATION_ERROR` |
| 로그인 만료 | 401. 기존 인증 처리에서 메모리 인증·반응 상태 정리 |

PR 본문에서 본인 글 제한과 마감 제한을 **합의가 필요한 추가 규칙**으로 설명하므로 BE와 최종 정책을 확인해야 합니다.
서버는 본인 글의 DELETE를 허용하지만, FE는 본인 글의 반응 조작을 비활성화합니다.
PUT/DELETE는 상태를 지정하는 요청이라 PR이 별도 Idempotency-Key를 요구하지 않습니다. 기존 다른 쓰기의 키 정책은 유지합니다.

## 3. 내 반응을 임의로 만들지 않는 방식

현재 공개 의견/답글 응답에는 **내 반응이 없습니다.**
로그인 직후·재시작·계정 변경 직후에는 내 반응을 `UNKNOWN`으로 취급합니다. UI 모델의 값이며 서버 응답 필드가 아닙니다.

- 처음 ↑/↓를 누르면 해당 반응으로 PUT합니다. 서버가 이미 같은 반응을 갖고 있어도 표수는 늘지 않습니다.
- 이번 앱에서 성공 확인한 반응은 선택 표시를 합니다. 같은 버튼을 다시 누르면 DELETE합니다.
- 이전 접속의 반응을 바로 지우려면 **내 반응 취소**를 사용합니다. 내 반응이 미확인일 때 제공하는 보완 동작입니다.
- 계정 변경·로그아웃·401 시 선택/재시도 상태를 지웁니다. 이전 계정의 늦은 응답은 무시합니다.
- 다른 기기에서 변경한 내 반응을 자동 복원·동기화하는 기능은 아닙니다.

BE가 향후 내 반응 조회를 추가하면 해당 계약을 확인한 뒤 초기 선택 상태를 복원할 수 있습니다.
현재 없는 myReaction/myVote 필드를 파서에 가정해서 넣지 않았습니다.

## 4. 중복 클릭과 오류 복구

동일한 글은 목록·펼친 답글·전체 답글 화면에서 **공통 잠금과 상태**를 사용합니다.
첫 클릭에서 즉시 잠그므로 React 화면 갱신 전에 다시 눌러도 추가 요청을 보내지 않습니다. 다른 글의 요청은 독립적입니다.
표수는 PUT 응답 또는 재조회 결과만 반영하며 성공 전에 미리 늘리지 않습니다.
화면 중앙의 표수는 기존 디자인대로 `공감 수 - 비공감 수`입니다. 각 버튼의 접근성 설명에는 개별 표수도 반영합니다.
카드의 글꼴·색·배치·StyleSheet와 공통 버튼은 유지하고, 처리 중/오류/재시도 안내는 카드 밖에 추가했습니다.

네트워크 오류·5xx 등 결과 불명확 상황에서는 원래 의도를 보관합니다.
예를 들어 UP 요청의 응답이 유실돼도 재시도는 **PUT UP**이며 DELETE 토글로 바뀌지 않습니다.
DELETE 응답 유실은 DELETE로 재시도합니다. DELETE가 성공하고 표수 조회만 실패하면 GET만 다시 보냅니다.
불명확한 요청이 남아 있을 때 다른 반응을 연속 전송하지 않습니다.
재시도 중 마감됐으면 쓰기를 중단하고, 미확인 표수 조회만 허용합니다.
이전 목록 GET이 늦게 도착해 새 반응 결과를 덮지 않도록 로컬 요청 순서를 비교합니다.

## 5. 파일별 역할과 수정 위치

| 파일 | 쉬운 설명 |
| --- | --- |
| `src/types/opinion-reaction.ts` | 확인된 UP/DOWN·표수·대상 글 타입. 공통 API 타입과 분리 |
| `src/services/opinion-reaction-api.ts` | 실제 PUT/DELETE, 응답 검사, 한국어 오류, 취소 후 표수 재조회 |
| `src/services/opinion-reaction-controller.ts` | React와 분리한 동작 담당. 등록/변경/취소 결정·공통 잠금·정확한 재시도·표수 상태 |
| `src/services/opinion-reactions.ts` | 컨트롤러에 실제 API를 연결하고 인증 변경 시 초기화 |
| `src/services/post-observation.ts` | 목록 조회와 반응 응답의 로컬 순서 기록. 서버 DTO와 별개 |
| `src/services/public-debate-api.ts` | 기존 목록/답글 조회 결과에 로컬 순서를 연결. API 경로나 응답 계약은 유지 |
| `src/services/http-gateway.ts` | 기존 `voteOpinion`도 실제 반응 처리에 연결 |
| `src/hooks/use-opinion-reaction.ts` | 로그인·참여·본인 글·마감 상태와 공통 반응 상태를 화면에 전달 |
| `src/features/opinions/api-opinion-card.tsx` | 기존 공통 카드에 실제 클릭·선택·표수·오류·재시도 연결 |
| `src/features/opinions/opinion-card.tsx` | 기존 카드 유지. 반응 처리 중 잠금과 미확인 숫자 표시·접근성 설명만 추가 |
| `src/features/opinions/public-opinion-feed.tsx` | 의견과 펼친 답글에 API 카드 사용. 기존 필터·정렬 유지 |
| `src/features/opinions/api-thread-screen.tsx` | 전체 답글 화면의 원문 카드도 같은 반응 처리 사용 |
| `.env.example` | 활성화 설정과 기본 OFF를 설명. 비밀번호를 넣지 않음 |
| `tests/opinion-reaction.test.ts` | 실제 계약 형태의 응답으로 API·권한·상태·오류·경합 테스트 |

API 계약이 바뀌면 타입과 API 파일부터, 동작 규칙이 바뀌면 컨트롤러와 테스트를 함께 수정합니다.
디자인은 기존 `OpinionCard`와 theme을 사용합니다. 정렬은 main에 병합된 PR #15의 구현을 유지합니다.

## 6. 배포 후 활성화 순서

1. BE #49의 병합·실제 개발 서버 배포·정책 합의를 확인합니다. PR 병합만으로 배포 완료라고 보지 않습니다.
2. 시연 계정으로 Basic 인증이 가능하고 ACTIVE/참여 상태인지 확인합니다.
3. 배포 확인한 환경에서만 `mobile/.env.local`에 다음 공개 설정을 적용합니다.

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://dev-api.yeongup.shop
EXPO_PUBLIC_DATA_SOURCE=api
EXPO_PUBLIC_OPINION_REACTIONS_ENABLED=true
```

```powershell
cd C:\dev\FE_repository\mobile
npm.cmd start -- --clear
```

웹은 허용된 `localhost:8082`로 실행합니다. 공개 환경변수는 번들에 들어가므로 웹 배포에서는 설정 후 다시 빌드·배포해야 합니다.
현재 `.env.local`은 수정하지 않았으며, 기본 OFF인 채로 남겨 뒀습니다.

## 7. 검증 결과와 BE에 남은 일

| 검사 | 결과 |
| --- | --- |
| `npm.cmd run typecheck` | 통과 |
| `npm.cmd run lint` | 오류·경고 0 |
| `npm.cmd test` | **92개 통과**. 기존 69개 + 새 반응 관련 23개 |
| `npm.cmd run test:web` | 기존 웹 **27개 경로** HTTP/SSR 통과 |
| Android/iOS/Web 번들 | 기본 OFF 구성 통과. 추가로 **기능 ON 설정에서도 전체 플랫폼 번들 통과** |
| 실제 BE 반응 PUT/DELETE | 미실행. PR 미병합·경로 404로 배포/쓰기 성공 미확인 |

번들 출력은 Git 제외 경로 `.expo/opinion-reactions-export`와 `.expo/opinion-reactions-enabled-export`에 있습니다.
빌드에서 ON 경로를 검사할 때만 자식 프로세스 환경변수를 사용했고 `.env.local`은 바꾸지 않았습니다.
검사용 웹 서버는 종료했습니다. 웹 경로 검사는 브라우저 버튼 클릭이나 휴대폰 실기기 검사와 다릅니다.

추가 단위 테스트는 다음을 검사합니다.

- Basic 헤더·정확한 경로/메서드/본문·64비트 문자열 ID·잘못된 응답 거절.
- UP→DOWN→같은 DOWN 취소, 재접속 전 반응의 명시적 취소, 204 처리.
- 본인 글·미참여·마감·비로그인·OFF 차단과 실제 서버 코드 보존.
- 연속 클릭·다른 화면의 같은 글 중복 요청 방지, 다른 글의 독립 요청.
- PUT/DELETE 응답 유실 후 동일 의도 재시도, 취소 후 GET만 재시도.
- 계정 전환 시 이전 응답 무시, 늦은 목록의 표수 덮어쓰기 방지.
- 원문·중첩 답글의 표수 페이지 탐색과 반복 cursor·조회 실패 처리.
- 응답 본문을 받는 도중 연결이 끊겼을 때 PUT과 표수 조회 모두 한국어 재시도 오류로 처리.

개발 서버는 **인증정보 없는 읽기 전용 OPTIONS 검사만** 수행했습니다.
일반 OPTIONS `/v1/posts/32/reaction`은 404이고, CORS preflight는 200과 PUT/DELETE 허용 헤더를 반환했습니다.
**CORS 200만으로 반응 경로 배포를 확인할 수 없습니다.** 실제 PUT/DELETE는 실행하지 않았고 서버 데이터를 바꾸지 않았습니다.

BE와 함께 남은 확인은 다음과 같습니다.

- 배포 후 A의 글에 B가 UP→DOWN→취소, 답글에도 같은 과정을 실제로 검사.
- 본인 글 403, 마감 409, 미참여 403과 Basic 인증을 실제 서버에서 확인.
- 웹 localhost:8082 및 실기기에서 실제 클릭·통신 오류·계정 전환 검사.
- 내 반응 조회 필드/API, 취소 응답 표수 또는 단일 원문 조회가 있으면 현재 보완 UI와 페이지 탐색을 줄일 수 있음. 아직 확정되지 않은 제안이며 FE가 미리 필드를 요구하지 않음.

최초 구현 단계에서는 새 브랜치의 로컬 변경으로만 남겼습니다. 이후 사용자 요청에 따라 같은 브랜치에서 Commit·Push하고 리뷰용 PR을 생성합니다. main 병합은 수행하지 않습니다.
