// src/index.ts

import express from 'express';
import * as dotenv from 'dotenv';
import { App, ExpressReceiver } from '@slack/bolt';
import { registerReactionAddedEvent } from './translation';
import { registerWelcomeEvents } from './welcome';
import { registerAdminEvents } from './admin';
import { registerNetworkCommands, registerNetworkViewHandler } from './network';
import { registerTradeEvents } from './trade';
import { registerTodayConversationEvents } from './today';
import { registerHelpCommand } from './help';
import { registerHoneyScore } from './network/honeyscore';

dotenv.config();

// 환경 변수 로드 여부 확인 (디버깅용)
console.log('SLACK_BOT_TOKEN is set:', !!process.env.SLACK_BOT_TOKEN);
console.log('SLACK_SIGNING_SECRET is set:', !!process.env.SLACK_SIGNING_SECRET);

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

// Slack Bolt 앱 초기화
export const boltApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  receiver, // ExpressReceiver 연결
});

// Bolt의 액션 핸들러 등록
boltApp.action('button_click', async ({ ack, body, client }) => {
  await ack(); // 액션을 확인합니다.

  try {
    // 클릭한 사용자에게 DM 전송
    await client.chat.postMessage({
      channel: body.user.id, // 사용자 ID로 메시지 전송
      text: 'Button clicked! Here is your response.',
    });
    console.log('Message sent to user:', body.user.id);
  } catch (error) {
    console.error('Error sending message:', error);
  }
});

// 이벤트 핸들러 및 명령어 핸들러 등록
registerReactionAddedEvent();
registerWelcomeEvents();
registerAdminEvents();
registerTradeEvents(boltApp);
registerTodayConversationEvents();
registerNetworkCommands(boltApp);
registerNetworkViewHandler(boltApp);
registerHelpCommand(boltApp);
registerHoneyScore(boltApp);

// 서버 실행
(async () => {
  const port = process.env.PORT || 3000;
  await boltApp.start(port); // 서버 시작
  console.log(`⚡️ Slack app is running on port ${port}`);
})();
