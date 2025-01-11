import { boltApp } from '../index';
import { Logger, BlockAction, SlashCommand } from '@slack/bolt'; // Command 제거
import { WebClient } from '@slack/web-api';
import { requestConvers } from '../AImodel';
import axios from 'axios';
import { getFileFromS3 } from '../s3service';

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
      // const url = `https://blackout-15-globee.s3.us-east-1.amazonaws.com/${userId}.json`;

      // const response = await axios.get(url, {
      //   responseType: 'json', // Automatically parses JSON response
      // });

      // const userInfo = response.data;

      // console.log('Parsed User Info:', userInfo);

      // const country = userInfo?.nationality ?? 'america';
      // console.log('Country:', country);

      const res = await getFileFromS3('blackout-15-globee', `${userId}.json`);
      console.log('res', res);
      const userInfo = JSON.parse(res);
      console.log('userInfo', userInfo);
      const country = userInfo?.nationality;
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
