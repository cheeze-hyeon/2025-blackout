import { App, ExpressReceiver } from '@slack/bolt';
import * as dotenv from 'dotenv';
import { registerReactionAddedEvent } from './translation';

dotenv.config();

// ExpressReceiver 초기화
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// URL 검증 처리 - ExpressReceiver의 Express 앱 사용
receiver.router.post('/slack/events', (req, res) => {
  const { type, challenge } = req.body;

  if (type === 'url_verification') {
    res.status(200).send(challenge); // Slack에서 보내는 검증 요청 처리
    return;
  }

  res.status(200).send(); // 다른 요청에 대해 200 응답
});

// Slack Bolt 앱 초기화
export const boltApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  receiver, // ExpressReceiver 연결
});

// Slack 이벤트 핸들러 등록
boltApp.event('app_mention', async ({ event, say }) => {
  console.log('Mention event received:', event); // 이벤트 로그 출력
  await say(`Hello <@${event.user}>!`); // 응답 메시지
});

registerReactionAddedEvent();
//서버 실행
(async () => {
  const port = process.env.PORT || 3000;
  await boltApp.start(port); // 서버 시작
  console.log(`⚡️ Slack app is running on port ${port}`);
})();
