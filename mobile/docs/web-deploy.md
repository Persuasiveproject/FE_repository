# 개발 웹 배포 (S3 + CloudFront)

PC에서 Expo 개발 서버를 켜지 않아도 휴대폰·PC 브라우저에서 바로 접속할 수 있도록, 앱을 정적 웹 파일로 만들어 S3에 올리고 CloudFront로 공개한다.

## 1. 빌드

`mobile/.env`

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://dev-api.yeongup.shop
EXPO_PUBLIC_DATA_SOURCE=api
```

```bash
npm run build:web   # 결과: mobile/dist/
```

- `EXPO_PUBLIC_` 값은 번들에 그대로 들어가 누구나 볼 수 있다. 비밀번호·API 키(예: Gemini 키)는 절대 넣지 않는다.
- 웹 배포 빌드만 `single` 출력(index.html 하나)을 쓴다. `npm run web`과 `test:web`은 기존 `server` 출력을 그대로 쓴다(`app.config.js`).

## 2. S3 버킷 (최초 1회)

- 이름 예: `yeongeopjung-dev-web`, 리전 `ap-northeast-2`
- 퍼블릭 액세스 차단은 켠 상태로 둔다. 파일은 CloudFront만 읽는다.

## 3. CloudFront 배포 (최초 1회)

- 원본: 위 S3 버킷, 원본 액세스는 **OAC**로 만들고 콘솔이 제시하는 버킷 정책을 버킷에 적용한다.
- 기본 루트 객체: `index.html`
- 뷰어 프로토콜: Redirect HTTP to HTTPS
- 사용자 지정 오류 응답: **403과 404 모두** → 응답 페이지 `/index.html`, 응답 코드 `200`, 캐시 TTL `0`
  - `/discussions/12/summary`처럼 파일이 없는 주소를 새로고침하거나 직접 열 때 앱이 경로를 처리하게 하는 설정이다.
- 배포가 끝나면 `https://xxxx.cloudfront.net` 주소가 생긴다. 도메인(`dev-web.yeongup.shop` 등)을 붙이려면 us-east-1 리전 ACM 인증서와 Route 53 레코드를 추가한다.

## 4. 업로드 (배포할 때마다)

```bash
aws s3 sync dist s3://yeongeopjung-dev-web --delete \
  --exclude index.html --exclude metadata.json \
  --cache-control "public,max-age=31536000,immutable"
aws s3 cp dist/index.html s3://yeongeopjung-dev-web/index.html --cache-control "no-cache"
aws s3 cp dist/metadata.json s3://yeongeopjung-dev-web/metadata.json --cache-control "no-cache"
aws cloudfront create-invalidation --distribution-id <배포ID> --paths "/index.html"
```

`_expo/static`의 파일 이름에는 내용 해시가 들어가므로 오래 캐시하고, `index.html`만 매번 새로 받게 한다. 콘솔에서 `dist/` 내용을 끌어다 올려도 동작은 같다(캐시 설정만 빠진다).

## 5. 백엔드 CORS (최초 1회, 주소가 바뀔 때)

개발 서버 환경 파일 `/etc/ye-develop-af08004.env`의 허용 목록에 웹 주소를 쉼표로 추가하고 API를 다시 배포한다. 백엔드 `docs/development-web-cors.md` 절차와 같다.

```dotenv
DJANGO_CORS_ALLOWED_ORIGINS=http://localhost:8082,https://xxxx.cloudfront.net
```

값은 브라우저 주소창의 origin이다(끝에 `/` 없음). AI 요약을 켜려면 같은 파일에 `AI_SUMMARY_ENABLED=true`와 `GEMINI_API_KEY`를 넣는다. 키는 서버 파일에만 두고 저장소·프론트 `.env`에는 넣지 않는다.

## 6. 확인

- 휴대폰 브라우저로 CloudFront 주소 접속 → 홈에 실제 토론 목록이 보이는지
- 토론 상세·AI 요약 주소에서 새로고침해도 화면이 열리는지
- 개발자 도구 Network에서 API 요청이 CORS 오류 없이 200인지
