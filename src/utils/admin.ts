// src/utils/admin.ts

import { WebClient } from '@slack/web-api';
import { Logger } from '@slack/bolt';

/**
 * 사용자가 관리자 권한을 가지고 있는지 확인하는 함수.
 * @param client Slack WebClient
 * @param userId 사용자 ID
 * @param logger Logger 인스턴스
 * @returns 관리자 여부
 */
export async function isUserAdmin(client: WebClient, userId: string, logger: Logger): Promise<boolean> {
  try {
    const userInfo = await client.users.info({ user: userId });
    if (!userInfo.ok || !userInfo.user) {
      logger.error(`사용자 정보 가져오기 실패: ${userId}`);
      return false;
    }
    return userInfo.user.is_admin || false;
  } catch (error) {
    logger.error('관리자 여부 확인 중 오류 발생:', error);
    return false;
  }
}