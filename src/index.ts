import express from 'express';
import { App, ExpressReceiver } from '@slack/bolt';
import * as dotenv from 'dotenv';

dotenv.config();

const expressApp = express();
expressApp.use(express.json());

// URL 검증 처리
expressApp.post('/slack/events', (req, res) => {
  const { type, challenge } = req.body;

  if (type === 'url_verification') {
    // challenge 값을 반환
    res.status(200).send(challenge);
    return;
  }

  // URL 검증 외의 요청은 200 응답
  res.status(200).send();
});

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// Slack Bolt 앱 초기화
const boltApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  receiver,
});

// Slack 이벤트 핸들러
boltApp.event('app_mention', async ({ event, say }) => {
  console.log('Mention event received:', event);
  await say(`Hello <@${event.user}>!`);
});

// 서버 시작
(async () => {
  const port = process.env.PORT || 3000;
  expressApp.listen(port, () => {
    console.log(`⚡️ Slack app is running on port ${port}`);
  });
})();
