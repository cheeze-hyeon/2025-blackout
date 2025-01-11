// src/network/honeyscore.ts

import { App, KnownEventFromType } from '@slack/bolt';
import { uploadToS3, getFileFromS3 } from '../s3service'; // 가정: 여기에 S3 함수를 구현
import { Logger } from '@slack/bolt';

// 메시지 이벤트용 타입 별칭 (Bolt 3.x 기준)
type SlackMessageEvent = KnownEventFromType<'message'> & {
  subtype?: string;
};

// 각 채널마다 저장할 정보 구조
interface ChannelData {
  networkName: string;
  teamNumber: number;
  score: number; // 누적 대화 수
}

/**
 * S3에서 channelId에 해당하는 ChannelData를 읽어오는 함수
 */
async function getChannelData(
  channelId: string,
  logger: Logger,
): Promise<ChannelData | null> {
  logger.info(`[DEBUG] getChannelData: channel=${channelId}`);
  try {
    // 예: S3 버킷명은 'blackout-15-globee'라고 가정
    const bucketName = 'blackout-15-globee';
    // 파일명 규칙: `dmChannel-${channelId}.json`
    const fileKey = `dmChannel-${channelId}.json`;

    const fileString = await getFileFromS3(bucketName, fileKey);
    if (!fileString) {
      // S3에서 해당 파일이 없으면 null
      logger.debug(
        `[DEBUG] getChannelData: No file found for channel=${channelId}`,
      );
      return null;
    }
    const data = JSON.parse(fileString) as ChannelData;
    return data;
  } catch (err) {
    logger.error('Error in getChannelData:', err);
    return null;
  }
}

/**
 * S3에 channelId에 해당하는 ChannelData를 저장(업데이트)하는 함수
 */
export async function saveChannelData(
  channelId: string,
  data: ChannelData,
  logger: Logger,
): Promise<void> {
  logger.info(
    `[DEBUG] saveChannelData: channel=${channelId}, data=${JSON.stringify(
      data,
    )}`,
  );
  try {
    const fileKey = `dmChannel-${channelId}.json`;

    const fileString = JSON.stringify(data);
    const fileBuffer = Buffer.from(fileString, 'utf-8');
    await uploadToS3(fileBuffer, fileKey);
    logger.debug(`[DEBUG] saveChannelData: channel=${channelId}, data=`, data);
  } catch (err) {
    logger.error('Error in saveChannelData:', err);
  }
}

/**
 * 허니 스코어(대화수) 기능을 등록하는 함수
 */
export function registerHoneyScore(app: App) {
  // (1) 유저 메시지 감지 → 점수 누적 (봇 메시지 제외)
  app.event('message', async ({ event, logger }) => {
    logger.info(`[DEBUG] Received message event: `, event);
    try {
      const msg = event as SlackMessageEvent;

      // 봇 메시지(subtype === 'bot_message')는 무시
      if (msg.subtype === 'bot_message') {
        return;
      }

      const channelId = msg.channel;

      // 1) 채널 정보 S3에서 읽기
      let channelData = await getChannelData(channelId, logger);
      console.log('channelData:', channelData);

      // 2) 만약 기존 파일이 없다면(=null) → 이 채널은 네트워킹 DM이 아닐 수 있으므로 그냥 무시
      if (!channelData) {
        return;
      }

      // 3) score + 1 후 S3에 저장
      channelData.score = (channelData.score || 0) + 1;
      console.log('updated SCore', channelData.score);
      await saveChannelData(channelId, channelData, logger);
      console.log('channelData:', channelData);

      logger.info(
        `Channel ${channelId} message count updated = ${channelData.score}`,
      );
    } catch (error) {
      console.error('Error counting message:', error);
    }
  });

  // (2) /score 슬래시 커맨드 등록
  app.command('/score', async ({ command, ack, client, logger }) => {
    await ack();

    try {
      // 사용자가 입력한 전체 텍스트 (예: "/score 봄맞이 해커톤 3")
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
      const enteredTeamNumber = parseInt(teamNumberStr, 10);

      logger.debug(
        `[DEBUG] teamNumberStr = "${teamNumberStr}", parsed => ${enteredTeamNumber}`,
      );

      // 파싱 실패 시
      if (Number.isNaN(enteredTeamNumber)) {
        logger.debug('[DEBUG] enteredTeamNumber is NaN');
        await client.chat.postMessage({
          channel: command.channel_id,
          text: '조 번호가 유효한 숫자가 아닙니다. 예: `/score 해커톤 3`',
        });
        return;
      }

      // 나머지는 네트워킹 이름
      const enteredNetworkName = parts.join(' ');
      logger.debug(`[DEBUG] enteredNetworkName = "${enteredNetworkName}"`);

      // slash command를 입력한 채널
      const channelId = command.channel_id;
      logger.debug(`[DEBUG] channelId => ${channelId}`);

      // S3에서 channelId에 대한 정보 읽어오기
      const channelData = await getChannelData(channelId, logger);
      logger.debug(`[DEBUG] S3 channelData => `, channelData);

      if (!channelData) {
        // 매핑 정보가 없으면 "다른 조의 점수는 볼 수 없습니다."
        await client.chat.postMessage({
          channel: channelId,
          text: '다른 조의 점수는 볼 수 없습니다.',
        });
        return;
      }

      // 실제 DM채널에 매핑된 정보
      const { networkName, teamNumber, score } = channelData;
      logger.debug(
        `[DEBUG] Actual (networkName, teamNumber) => ("${networkName}", ${teamNumber})`,
      );

      // (네트워킹 이름, 조번호)가 일치?
      if (
        networkName === enteredNetworkName &&
        teamNumber === enteredTeamNumber
      ) {
        logger.debug('[DEBUG] => networkName/teamNumber matches user input!');
        // 채널 점수 안내
        await client.chat.postMessage({
          channel: channelId,
          text: `${networkName} ${teamNumber}조의 Honey Score는 ${
            score ?? 0
          }점입니다!`,
        });
      } else {
        logger.debug(
          '[DEBUG] => Mismatch: ' +
            `("${networkName}" vs "${enteredNetworkName}") / (${teamNumber} vs ${enteredTeamNumber})`,
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
