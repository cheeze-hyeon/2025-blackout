// src/network/honeyscore.ts
import { App, KnownEventFromType } from '@slack/bolt';

// 메시지 이벤트용 타입 별칭
type SlackMessageEvent = KnownEventFromType<'message'> & {
  subtype?: string;
};

/**
 * DM방(채널)마다 다음과 같이 매핑합니다:
 *   dmChannelMap[channelId] = { networkName: string, teamNumber: number }
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
      // 메시지 형식을 좁혀서 사용하기 위해 GenericMessageEvent로 캐스팅
      const msg = event as SlackMessageEvent;
      
      // subtype이 'bot_message'면 무시(봇이 보낸 메시지)
      if (msg.subtype === 'bot_message') {
        return;
      }

      // 채널 ID별로 카운트
      const channelId = msg.channel;
      channelScoreMap[channelId] = (channelScoreMap[channelId] || 0) + 1;
      logger.info(`Channel ${channelId} message count = ${channelScoreMap[channelId]}`);
    } catch (error) {
      logger.error('Error counting message:', error);
    }
  });

  // (2) /score 슬래시 커맨드 등록
  app.command('/score', async ({ command, ack, client, logger }) => {
    await ack();

    try {
      // 사용자가 입력한 전체 텍스트 파싱 (예: "/score 해커톤 1")
      const text = command.text.trim(); 
      const parts = text.split(/\s+/);

      // 최소 2개 이상의 토큰이 있어야 [네트워킹 이름, 조 번호] 구조가 성립
      if (parts.length < 2) {
        await client.chat.postMessage({
          channel: command.channel_id,
          text: '사용법: `/score 네트워킹이름 조번호` (예: `/score 봄맞이 해커톤 3`)',
        });
        return;
      }

      const teamNumberStr = parts.pop() as string;
      const enteredteamNumber = parseInt(teamNumberStr, 10);

      if (Number.isNaN(enteredteamNumber)) {
        await client.chat.postMessage({
          channel: command.channel_id,
          text: '조 번호가 유효한 숫자가 아닙니다. 예: `/score 해커톤 3`',
        });
        return;
      }

      const enteredNetworkName = parts.join(' ');

      // 슬래시 커맨드를 입력한 채널 (현재 DM창)
      const channelId = command.channel_id;

      // 매핑 정보가 없으면 → "다른 조의 점수는 볼 수 없습니다."
      if (!dmChannelMap[channelId]) {
        await client.chat.postMessage({
          channel: channelId,
          text: '다른 조의 점수는 볼 수 없습니다.',
        });
        return;
      }

      // 실제 DM채널에 매핑되어 있는 정보
      const { networkName, teamNumber } = dmChannelMap[channelId];

      // 사용자가 입력한 (네트워킹 이름, 조번호)와 이 DM채널이 일치?
      if (
        networkName === enteredNetworkName &&
        teamNumber === enteredteamNumber
      ) {
        // 점수 가져와서 안내
        const score = channelScoreMap[channelId] || 0;
        await client.chat.postMessage({
          channel: channelId,
          text: `${networkName} ${teamNumber}조의 Honey Score는 ${score}점입니다!`,
        });
      } else {
        // 불일치 → 권한없음 메시지
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
