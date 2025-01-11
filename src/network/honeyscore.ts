// src/network/honeyscore.ts

import { App, KnownEventFromType } from '@slack/bolt';

// 메시지 이벤트용 타입 별칭
type SlackMessageEvent = KnownEventFromType<'message'> & {
  subtype?: string;
};

/**
 * DM방(채널)마다 다음과 같이 매핑합니다:
 *   dmChannelMap[channelId] = { networkName: string; teamNumber: number }
 */
export const dmChannelMap: Record<string, { networkName: string; teamNumber: number }> = {};

/**
 * 채널별 메시지 수를 저장합니다:
 *   channelScoreMap[channelId] = number
 */
export const channelScoreMap: Record<string, number> = {};

/**
 * 허니 스코어(대화수) 기능을 등록하는 함수
 */
export function registerHoneyScore(app: App) {
  // (1) 유저 메시지 감지 → 점수 누적
  //    - 봇 메시지(subtype === 'bot_message')는 카운트하지 않음
  app.event('message', async ({ event, logger }) => {
    try {
      const msg = event as SlackMessageEvent;
      
      // subtype이 'bot_message'면 무시(봇이 보낸 메시지)
      if (msg.subtype === 'bot_message') {
        return;
      }

      // 채널 ID별로 카운트
      const channelId = msg.channel;
      channelScoreMap[channelId] = (channelScoreMap[channelId] || 0) + 1;
      logger.info(
        `Channel ${channelId} message count = ${channelScoreMap[channelId]}`
      );
    } catch (error) {
      logger.error('Error counting message:', error);
    }
  });

  // (2) /score 슬래시 커맨드 등록
  app.command('/score', async ({ command, ack, client, logger }) => {
    await ack();

    try {
      // 사용자가 입력한 전체 텍스트
      const text = command.text.trim();
      logger.debug(`[DEBUG] Full command text => "${text}"`);

      // 공백으로 split
      const parts = text.split(/\s+/);
      logger.debug(`[DEBUG] Split parts =>`, parts);

      // 최소 2개 이상의 토큰이 있어야 [네트워킹 이름, 조 번호] 구조가 성립
      if (parts.length < 2) {
        logger.debug('[DEBUG] parts.length < 2 => Not enough tokens');
        await client.chat.postMessage({
          channel: command.channel_id,
          text: '사용법: `/score 네트워킹이름 조번호` (예: `/score 봄맞이 해커톤 3`)',
        });
        return;
      }

      // 마지막 토큰 = 조 번호
      const teamNumberStr = parts.pop() as string;
      const enteredteamNumber = parseInt(teamNumberStr, 10);

      logger.debug(
        `[DEBUG] teamNumberStr = "${teamNumberStr}", parsed => ${enteredteamNumber}`
      );

      // 파싱 실패 시
      if (Number.isNaN(enteredteamNumber)) {
        logger.debug('[DEBUG] enteredteamNumber is NaN');
        await client.chat.postMessage({
          channel: command.channel_id,
          text: '조 번호가 유효한 숫자가 아닙니다. 예: `/score 해커톤 3`',
        });
        return;
      }

      // 나머지는 네트워킹 이름
      const enteredNetworkName = parts.join(' ');
      logger.debug(`[DEBUG] enteredNetworkName = "${enteredNetworkName}"`);

      // 슬래시 커맨드를 입력한 채널
      const channelId = command.channel_id;
      logger.debug(`[DEBUG] channelId => ${channelId}`);

      // 매핑 정보 조회
      const dmInfo = dmChannelMap[channelId];
      logger.debug(`[DEBUG] dmChannelMap[${channelId}] =>`, dmInfo);

      if (!dmInfo) {
        logger.debug('[DEBUG] No dmInfo found => sending "다른 조의 점수는 볼 수 없습니다."');
        await client.chat.postMessage({
          channel: channelId,
          text: '다른 조의 점수는 볼 수 없습니다.',
        });
        return;
      }

      // 실제 DM채널에 매핑된 정보
      const { networkName, teamNumber } = dmInfo;
      logger.debug(`[DEBUG] Actual (networkName, teamNumber) => ("${networkName}", ${teamNumber})`);

      // 비교 로직
      if (
        networkName === enteredNetworkName &&
        teamNumber === enteredteamNumber
      ) {
        logger.debug('[DEBUG] => networkName/teamNumber matches user input!');
        // 점수
        const score = channelScoreMap[channelId] || 0;
        await client.chat.postMessage({
          channel: channelId,
          text: `${networkName} ${teamNumber}조의 Honey Score는 ${score}점입니다!`,
        });
      } else {
        logger.debug(
          '[DEBUG] => Mismatch: ' +
            `("${networkName}" vs "${enteredNetworkName}") / (${teamNumber} vs ${enteredteamNumber})`
        );
        await client.chat.postMessage({
          channel: channelId,
          text: '다른 조의 점수는 볼 수 없습니다.',
        });
      }
    } catch (error) {
      logger.error('Error processing /score command:', error);
    }
  });
}
