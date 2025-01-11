import { App, ExpressReceiver } from '@slack/bolt';
import * as dotenv from 'dotenv';
import { registerReactionAddedEvent } from './translation';
import bodyParser from 'body-parser';
import express from 'express';

dotenv.config();

// ExpressReceiver 초기화
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

const app = express();
// 슬랙에서 오는 요청은 application/x-www-form-urlencoded 형식입니다
receiver.router.use(express.urlencoded({ extended: true }));
receiver.router.use(express.json());

// URL 검증 처리 - ExpressReceiver의 Express 앱 사용
receiver.router.post('/slack/events', (req, res) => {
  const { type, challenge } = req.body;

  if (type === 'url_verification') {
    res.status(200).send(challenge); // Slack에서 보내는 검증 요청 처리
    return;
  }

  res.status(200).send(); // 다른 요청에 대해 200 응답
});

receiver.router.post('/slack/commands', async (req, res) => {
  console.log('Headers:', req.headers);
  console.log('Parsed body:', req.body);
  console.log('Command received:', req.body); // 요청 로그 출력
  const { command, text, user_id, channel_id } = req.body;

  if (command === '/travel') {
    const responseMessage = {
      response_type: 'in_channel',
      text: `Hello <@${user_id}>! Here's your template:`,
    };
    res.json(responseMessage);
  } else {
    res.status(200).send('Unknown command');
  }
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

// 서버 실행
(async () => {
  const port = process.env.PORT || 3000;
  await boltApp.start(port); // 서버 시작
  console.log(`⚡️ Slack app is running on port ${port}`);
})();
