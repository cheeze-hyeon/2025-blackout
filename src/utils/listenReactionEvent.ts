import { App } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { isTranslateRequestReaction } from '../translation/const';
import { useTranslation } from '../translation/api';
import { isTradeAcceptRequestReaction } from '../trade/util';

export const listenReactionEvent = (app: App) => {
  app.event('reaction_added', async ({ event, client, logger }) => {
    logger.info('Reaction added event received:', event);

    const { user, reaction, item } = event;

    // Step 1: Item type 확인
    if (item.type !== 'message') {
      logger.warn(`Reaction added to unsupported item type: ${item.type}`);
      return;
    }

    logger.info(
      `Reaction added: ${reaction}, by user: ${user}, on message: ${item.ts}`,
    );

    const { channel, ts } = item;

    try {
      // Step 2: Message history 가져오기
      logger.info(
        `Fetching message history for channel: ${channel}, ts: ${ts}`,
      );
      const history = await client.conversations.history({
        channel,
        latest: ts,
        limit: 1,
        inclusive: true,
      });

      logger.debug('Message history retrieved:', history);

      const authorId = history.messages && history.messages[0]?.user; // 작성자 ID
      const targetText = history.messages && history.messages[0]?.text;

      logger.info(`Message author ID: ${authorId}`);
      logger.info(`Target message text: "${targetText}"`);

      const reactionType = isTranslateRequestReaction(reaction)
        ? 'translation'
        : isTradeAcceptRequestReaction(reaction)
        ? 'trade'
        : null;

      if (!targetText || !authorId) {
        logger.error(
          'Message text or author ID is missing. Sending failure message.',
        );

        if (reactionType === 'translation') {
          makeTranslationFailMessage({
            channel,
            client,
            user,
          });
        } else if (reactionType === 'trade') {
          makeTradeRequestFailMessage({
            channel,
            client,
            user,
          });
        }
        return;
      }

      if (reactionType === 'translation') {
        // Translation-specific logic
        const isTranslationReaction = isTranslateRequestReaction(reaction);
        if (!isTranslationReaction) {
          logger.info(
            `Reaction "${reaction}" is not a translation reaction. Ignoring.`,
          );
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

        const { translated } = translateResult;
        await client.chat.postEphemeral({
          channel,
          user,
          text: translated,
        });

        logger.info('Translation response sent to user.');
      } else if (reactionType === 'trade') {
        // Trade-specific logic
        const isTradeAcceptReaction = isTradeAcceptRequestReaction(reaction);
        if (!isTradeAcceptReaction) {
          logger.info(
            `Reaction "${reaction}" is not a trade accept reaction. Ignoring.`,
          );
          return;
        }

        logger.info(
          `Creating DM channel between author: ${authorId} and user: ${user}`,
        );
        const dmResponse = await client.conversations.open({
          users: `${authorId},${user}`,
        });

        logger.debug('DM channel response:', dmResponse);

        if (dmResponse.ok && dmResponse.channel?.id) {
          const dmChannelId = dmResponse.channel.id;
          logger.info(`DM channel created: ${dmChannelId}`);

          const tradeMessage = `
            안녕하세요! 🛒
            아래의 메시지에 대해 거래를 요청하셨습니다:
            > "${targetText}"

            이 채널에서 거래를 진행해주세요.  
            안전한 거래를 위해 필요한 추가 정보를 서로 확인하시고 협의하세요. 😊
          `;

          await client.chat.postMessage({
            channel: dmChannelId,
            text: tradeMessage.trim(),
          });

          logger.info('Trade request message sent to DM channel.');
        } else {
          logger.error('Failed to create DM channel:', dmResponse);
        }
      }
    } catch (error) {
      logger.error('Error during processing reaction_added event:', error);
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

export const makeTradeRequestFailMessage = async ({
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
    text: '거랙 신청에 실패하였습니다.',
  });
  return failMessage;
};
