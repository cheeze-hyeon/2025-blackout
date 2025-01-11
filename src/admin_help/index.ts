// src/admin_help/index.ts

import { App } from '@slack/bolt';
import { isUserAdmin } from '../utils/admin'; // 관리자 검증 함수 임포트

/**
 * /admin_help 명령어 핸들러를 등록합니다.
 * @param app Slack Bolt App 인스턴스
 */
export function registerAdminHelpCommand(app: App) {
  app.command('/admin_help', async ({ command, ack, client, logger }) => {
    await ack();

    const { user_id, channel_id } = command;

    try {
      // 관리자 여부 확인
      const isAdmin = await isUserAdmin(client, user_id, logger);
      if (!isAdmin) {
        // 관리자가 아닌 경우 접근 차단
        await client.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          text: '이 명령어는 관리자만 사용할 수 있습니다.',
        });
        return;
      }

      // 관리자 도움말 메시지
      const adminHelpMessage = `
*Commands for Admins:*
- \`/globee_admin\` : 워크스페이스 정보를 입력할 수 있습니다.
- \`/network\` : 네트워킹 그룹을 생성합니다.
      `;

      // 관리자에게 도움말 전송
      await client.chat.postEphemeral({
        channel: channel_id,
        user: user_id,
        text: adminHelpMessage,
      });
      logger.info('Admin help message sent successfully.');
    } catch (error) {
      logger.error('Error sending admin help message:', error);
      await client.chat.postEphemeral({
        channel: channel_id,
        user: user_id,
        text: '관리자 도움말을 가져오는 중 오류가 발생했습니다. 나중에 다시 시도해주세요.',
      });
    }
  });
}