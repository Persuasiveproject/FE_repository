const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['.expo/**', 'dist/**'] },
  // Expo 템플릿의 웹 hydration 처리. 홈 개선 범위 밖이므로 기존 동작을 유지합니다.
  { files: ['src/hooks/use-color-scheme.web.ts'], rules: { 'react-hooks/set-state-in-effect': 'off' } },
]);
