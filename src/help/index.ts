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
*GloBee🐝 도움말*

- *\`/help\`*
    GloBee🐝 도움말을 출력해요.

- *\`/globee_start\`*
    사용자 정보를 다시 입력할 수 있어요.

- *\`/ask 자유로운질문\`*
    자유롭게 질문하세요! GloBee🐝가 친절하게 답변해줄게요.
    
- *\`/today\`*
    <#C0882E5KPU6|오늘의-회화> 채널에 지정된 국가의 오늘의 회화 구문을 제공해요.

- *\`/trade\`*
    <#C088965R4FL|물건-삽니다-팝니다> 채널에 새로운 거래를 등록할 수 있어요.

- *\`/score 네트워킹이름 조번호\` (예: \`/score 봄맞이 해커톤 3\`)*
    현재 소속되어있는 네트워킹 조의 *HoneyPot*🍯이 얼마나 차올랐는지 보여줘요. *HoneyPot*🍯을 가득 채워봅시다!

- *\`/searchInfo\`*
    관심있다고 등록한 키워드에 관련된 정보를 GloBee🐝가 DM으로 전달해드릴게요.

- *\`번역\`*
    문장에 국기(🇺🇸, 🇯🇵)로 감정표현을 표시하면, GloBee🐝가 해당 언어로 번역해줄게요. 
    If you need \`/help\` by other langauges, please push an emoji(🇺🇸, 🇯🇵) at this comment.
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