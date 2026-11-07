# 백엔드 연결 전 확인 사항

확인일: 2026-11-08. BE는 읽기 전용으로 확인했으며 파일을 변경하지 않았습니다.

핵심 화면은 메모리 기반 `AppGateway`로 구현했습니다. [화면 안내](core-screens-guide.md)와 [API 연결 방법](core-api-integration.md)을 함께 확인하세요.
화면 구현과 실서버 연결 여부는 구분합니다. 아래 경로는 여전히 실제 앱에 연결되지 않았습니다.

## 확인 기준

- [BE main](https://github.com/Persuasiveproject/BE_repository/tree/8c5e4b3b5ed339d2bb887db14d26c30bb2686310): README만 있습니다.
- [BE develop](https://github.com/Persuasiveproject/BE_repository/tree/e72c8a446077eceff653ee52fc31078a2f490e33): 아래 API의 코드가 존재합니다. 배포 서버에서 동작하는지 검증한 것은 아닙니다.
- [URL 연결](https://github.com/Persuasiveproject/BE_repository/blob/e72c8a446077eceff653ee52fc31078a2f490e33/debates/urls.py), [API 개발 문서](https://github.com/Persuasiveproject/BE_repository/blob/e72c8a446077eceff653ee52fc31078a2f490e33/debates/api/README.md).

## 코드에서 확인한 경로

| 메서드·경로 | 접근 | 현재 FE 상태 |
| --- | --- | --- |
| GET `/v1/me/debates?status=OPEN&cursor=...` | 활성 회원 | DTO·요청 함수만 준비. 인증 가드가 요청 차단 |
| GET/PATCH `/v1/debates/{id}/me/stance` | 활성 회원 | 미연결 |
| GET `/v1/debates/{id}/me/events` | 활성 회원 | 미연결 |
| GET `/v1/debates/{id}/timing` | AllowAny | 미연결. 공통 응답 포장 차이 있음 |
| GET `/v1/debates/{id}/result` | AllowAny | 미연결 |
| GET `/health/` | 상태 확인 | 미연결 |

`status`는 선택이며 OPEN/CLOSED만 허용합니다. cursor는 서버가 준 문자열을 그대로 다음 요청에 전달합니다.
목록 기본 크기는 20이며 다음 cursor가 없으면 null입니다.

## 참여 목록 응답

```ts
{
  data: { debates: [{
    id: string,
    kind: string,
    title: string,
    status: 'OPEN' | 'CLOSED',
    createdAt: string,
    categoryId: string,
    participantCount: number,
    opinionCount: number,
    viewCount: number,
    startedAt: string | null,
    endsAt: string | null,
    closedAt: string | null,
    canceledAt: string | null
  }] },
  meta: { nextCursor: string | null }
}
```

근거: [JoinedDebateSerializer](https://github.com/Persuasiveproject/BE_repository/blob/e72c8a446077eceff653ee52fc31078a2f490e33/debates/api/joined/serializers.py).
ID는 숫자로 변환하지 않는 문자열입니다. 64비트 ID를 JS number로 바꾸면 정밀도를 잃을 수 있습니다.
타입은 `src/types/api.ts`에 있습니다. 이 응답에는 카드의 설명·카테고리 이름·현재 입장이 없습니다.
UI용 `Discussion`과 같은 구조라고 간주하거나 없는 값을 실제 서버 데이터처럼 채우면 안 됩니다.

결과 API의 `data`에는 counts, sankeyData, genderData, ageData, regionData, genderHidden, ageHidden, computedAt이 있습니다.
결과의 제목·종료 시각은 이 응답에 없으며, 상세 API가 구현된 뒤 별도로 연결해야 합니다.
이 응답의 프런트엔드 DTO는 이번 범위에서 만들지 않았습니다.

## 공통 오류

```json
{ "error": { "code": "RESULT_NOT_READY", "message": "...", "details": { "status": "PENDING" } } }
```

`details`는 선택 값이며 형태가 기능마다 다르므로 `unknown`으로 보존합니다.
`ApiError`는 HTTP 상태, code, message, details를 저장합니다.
네트워크 오류와 JSON 파싱 실패는 각각 NETWORK_ERROR, INVALID_RESPONSE로 구분하며 취소는 그대로 전달합니다.
성공 응답의 generic 타입은 컴파일 시 계약일 뿐, 런타임 스키마 검증을 대신하지 않습니다. 실제 연동 시 DTO 검증/변환을 추가해야 합니다.

## 인증은 아직 미확정

[회원 앱 문서](https://github.com/Persuasiveproject/BE_repository/blob/e72c8a446077eceff653ee52fc31078a2f490e33/accounts/README.md)에 카카오·이메일 로그인은 미구현으로 기록되어 있습니다.
설정에 프로젝트 전용 JWT 인증 클래스가 없고, BE 테스트는 `force_authenticate`를 사용합니다.
따라서 Bearer 토큰 방식이 확정되었다고 볼 수 없습니다. 실제 로그인 API, 세션/토큰 전달, 갱신, CSRF, 저장소 정책은 BE와 합의해야 합니다.

- `apiRequest(..., { auth: 'public' })`: 쿠키 없이 요청합니다.
- `apiRequest(..., { auth: 'required' })`: AUTH_NOT_CONFIGURED로 네트워크 요청 전에 중단합니다.
- `getJoinedDebates`는 이 가드 때문에 현재 실서버를 호출하지 않습니다. 참여 중 화면도 이 함수를 호출하지 않습니다.
- 로그인 확정 후 `api-client.ts`의 인증 처리와 `joined-debates.ts`를 연결하고 실기기·웹에서 검증해야 합니다.

## 아직 확인되지 않은 API

홈 인기/추천, 공개 토론 목록·검색·상세, 생성, 로그인, 댓글/대댓글, 투표의 연결된 URL은 확인 기준 develop에서 찾지 못했습니다.
모델이 존재하는 것과 API가 구현된 것은 다릅니다. 이 경로를 추측해 FE에 추가하지 않았습니다.
Mock 핵심 데이터는 `src/services/mock-gateway.ts`가 공급하며 화면은 `gateway`를 사용합니다.
기존 홈/목록은 `src/services/discussions.ts`를 거쳐 같은 데이터를 사용합니다. 실제 계약이 나오면 HTTP gateway와 DTO 변환을 추가합니다.

## 서버 연결 시 체크

1. 실제 배포 서버 origin을 `EXPO_PUBLIC_API_BASE_URL`에 지정합니다. `/v1`은 service 경로에 포함되어 있으므로 중복하지 않습니다.
2. 웹 CORS 및 인증 정책은 BE 담당자와 확인합니다. 현재 settings에 CORS 미들웨어가 보이지 않습니다.
3. Android 에뮬레이터는 PC localhost 대신 `10.0.2.2`, 실기기는 접근 가능한 PC LAN 주소/HTTPS 서버를 사용합니다.
4. EXPO_PUBLIC 값은 앱에 공개됩니다. 비밀번호·서버 비밀키·토큰을 넣지 않습니다.
5. 로그인·API 테스트는 아직 수행하지 않았으므로 배포 가능하다고 판정하지 않습니다.
