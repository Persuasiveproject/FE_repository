// 정적 호스팅(S3+CloudFront)용 웹 빌드. 결과는 dist/에 생성됩니다.
// API 주소와 데이터 모드는 빌드 시점의 .env 값이 번들에 고정됩니다.
import { spawnSync } from 'node:child_process';

const env = { ...process.env, EXPO_WEB_OUTPUT: 'single' };
for (const key of ['EXPO_PUBLIC_API_BASE_URL', 'EXPO_PUBLIC_DATA_SOURCE']) {
  console.log(`${key}=${env[key] ?? '(.env 값 사용)'}`);
}
const result = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', 'dist', '--clear'], {
  stdio: 'inherit', env, shell: process.platform === 'win32',
});
process.exit(result.status ?? 1);
