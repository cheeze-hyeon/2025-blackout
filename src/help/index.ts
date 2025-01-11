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
*HOW TO USE GLOBEE🐝*

- \`/help\`
    GloBee🐝 도움말을 출력합니다.

- \`/globee_start\`
    사용자 정보를 다시 입력할 수 있습니다.

- \`/today\`
    *#오늘의-회화* 채널에 지정된 국가의 오늘의 회화 구문을 제공합니다.

- \`/trade\`
    *#물건-팝니다-삽니다* 채널에 새로운 거래를 등록할 수 있습니다.

- 번역
    번역하고 싶은 문장에 국기(🇺🇸, 🇯🇵)로 감정표현을 표시하면, 번역이 제공됩니다. 
    *If you need help by other langauges, please push an emoji(🇺🇸, 🇯🇵) at this comment.*
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