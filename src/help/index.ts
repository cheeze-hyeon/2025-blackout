// src/help/index.ts

import { App } from '@slack/bolt';

/**
 * /help 명령어 핸들러를 등록합니다.
 * @param app Slack Bolt App 인스턴스
 */
export function registerHelpCommand(app: App) {
  app.command('/help', async ({ command, ack, client, logger }) => {
    await ack();

    const helpMessage = `
*Commands:*
- \`/globee_start\` : 사용자 정보를 다시 입력할 수 있습니다.
- \`/trade\`: 트레이드를 진행할 수 있습니다.
- \`/today\`: 오늘의 회화를 제공합니다.

*Else:*
- Translation: 번역하고 싶은 문장을 번역하고 싶은 국가의 국기로 설정하면 됩니다.

*If you need English help, please push an emoji 🇺🇸 at this comment.*
    `;

    try {
      await client.chat.postMessage({
        channel: command.channel_id,
        text: helpMessage,
      });
      logger.info('Help message sent successfully');
    } catch (error) {
      logger.error('Error sending help message:', error);
    }
  });
}