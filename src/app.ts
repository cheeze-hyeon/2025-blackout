import { App } from '@slack/bolt';
import * as dotenv from 'dotenv';

dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// 기본 이벤트 핸들러
app.event('app_mention', async ({ event, say }) => {
  await say(`Hello <@${event.user}>!`);
});

// 앱 실행
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Slack app is running!');
})();
