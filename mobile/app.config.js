// app.json을 그대로 쓰되, 웹 배포 빌드에서만 웹 출력 방식을 바꿉니다.
// 개발 서버(npm run web)와 test:web은 기존 server 방식을 그대로 사용합니다.
module.exports = ({ config }) => ({
  ...config,
  web: { ...config.web, output: process.env.EXPO_WEB_OUTPUT || config.web.output },
});
