import { boltApp } from '../index';
import { useTranslation } from './api';
import { isTranslateRequestReaction } from './const';
import { WebClient } from '@slack/web-api';

export const registerReactionAddedEvent = () => {
  boltApp.event('reaction_added', async ({ event, client, say, body }) => {
    const { user, reaction, item, item_user } = event;
    if (item.type !== 'message') return;

    const isTranslationReaction = isTranslateRequestReaction(reaction);
    if (!isTranslationReaction) return;

    const { channel, ts } = item;

    // conversations.history API를 통해 해당 메시지의 내용 가져오기
    const history = await client.conversations.history({
      channel,
      latest: ts, // 이모지가 추가된 메시지의 타임스탬프
      limit: 1, // 한 개의 메시지만 조회
      inclusive: true, // 정확히 해당 메시지를 포함하도록
    });
    const targetText = history.messages && history.messages[0].text;

    if (!targetText) {
      makeTranslationFailMessage({
        channel,
        client,
        user,
      });
      return;
    }

    const translateResult = await useTranslation({
      text: targetText,
      language: reaction,
    });

    if (!translateResult) {
      makeTranslationFailMessage({
        channel,
        client,
        user,
      });
      return;
    }
    const { text, translated } = translateResult;
    try {
      // 이모지가 추가된 메시지에 버튼을 추가하여 응답
      await client.chat.postEphemeral({
        channel: item.channel, // 이모지가 추가된 채널
        user, // 이모지를 추가한 사용자에게만 메시지를 보냄
        text: translated,
      });
    } catch (error) {
      console.error('이모지 추가 후 버튼 전송 실패:', error);
    }
  });
};

const makeTranslationFailMessage = async ({
  client,
  channel,
  user,
}: {
  client: WebClient;
  channel: string;
  user: string;
}) => {
  const failMessage = await client.chat.postEphemeral({
    channel,
    user,
    text: '번역이 실패하였습니다.',
  });
  return failMessage;
};
