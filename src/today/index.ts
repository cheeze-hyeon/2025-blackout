import { boltApp } from '../index';
import { Logger, BlockAction, SlashCommand } from '@slack/bolt'; // Command 제거
import { WebClient } from '@slack/web-api';
import { requestConvers } from '../AImodel';
import { getFromS3 } from '../s3service';

export const registerTodayConversationEvents = async () => {
  // '/today' 명령어 핸들러 등록
  boltApp.command('/today', async ({ command, ack, client, logger }) => {
    await ack();

    try {
      const triggerId = command.trigger_id;
      const userId = command.user_id;

      if (!triggerId || !userId) {
        logger.error('trigger_id 또는 user_id가 존재하지 않습니다.');
        return;
      }

      // TO DO: 어드민 워크스페이스 국가 정보 가져오기
      const dataFromS3 = await getFromS3(userId);

      // Convert Buffer to JSON string and parse it
      const userInfo = JSON.parse(dataFromS3.toString('utf-8'));

      console.log('userInfo', userInfo);

      // Retrieve country information
      const country = userInfo?.nationality ?? 'america';

      console.log('Country:', country);

      const todayConversations = await requestConvers(country);

      console.log('todayConversations', todayConversations);

      await client.chat.postMessage({
        channel: 'C0882E5KPU6',
        text: `*오늘의 회화(Today's Phrase) 🗣️*\n\n${todayConversations}`,
      });
    } catch (error) {
      logger.error('오늘의 회화 중 오류 발생:', error);
    }
  });
};
