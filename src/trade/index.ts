import { App, Logger, BlockAction, ButtonAction } from '@slack/bolt'; // Command 제거
import { WebClient } from '@slack/web-api';
import { isTradeAcceptRequestReaction } from './util';

// 인메모리 거래 정보 저장소
const tradeInfoStore: Map<string, TradeInfo> = new Map();

// 거래 정보 인터페이스
interface TradeInfo {
  name: string;
  condition: string;
  price: string;
  place: string;
  description: string;
}

/**
 * 거래 정보 입력 모달을 여는 함수
 * @param client Slack WebClient
 * @param triggerId 트리거 ID
 */
const openTradeInfoModal = async (client: WebClient, triggerId: string) => {
  await client.views.open({
    trigger_id: triggerId,
    view: {
      type: 'modal',
      callback_id: 'trade_info_modal',
      title: {
        type: 'plain_text',
        text: '물건 나눔 & 거래',
      },
      submit: {
        type: 'plain_text',
        text: '제출',
      },
      close: {
        type: 'plain_text',
        text: '취소',
      },
      blocks: [
        {
          type: 'input',
          block_id: 'name_block',
          element: {
            type: 'plain_text_input',
            action_id: 'name',
            placeholder: {
              type: 'plain_text',
              text: '거래 물품명을 입력하세요.',
            },
          },
          label: {
            type: 'plain_text',
            text: '물품명',
          },
        },
        {
          type: 'input',
          block_id: 'condition_block',
          element: {
            type: 'static_select',
            action_id: 'condition',
            placeholder: {
              type: 'plain_text',
              text: '상태를 선택하세요',
            },
            options: [
              {
                text: {
                  type: 'plain_text',
                  text: '새 제품',
                },
                value: '새 제품',
              },
              {
                text: {
                  type: 'plain_text',
                  text: '약간 사용',
                },
                value: '약간 사용',
              },
              {
                text: {
                  type: 'plain_text',
                  text: '사용감 있음',
                },
                value: '사용감 있음',
              },
            ],
          },
          label: {
            type: 'plain_text',
            text: '상태',
          },
        },
        {
          type: 'input',
          block_id: 'price_block',
          element: {
            type: 'plain_text_input',
            action_id: 'price',
            placeholder: {
              type: 'plain_text',
              text: '판매 / 교환 / 무료 나눔',
            },
          },
          label: {
            type: 'plain_text',
            text: '가격',
          },
        },
        {
          type: 'input',
          block_id: 'place_block',
          element: {
            type: 'plain_text_input',
            action_id: 'place',
            placeholder: {
              type: 'plain_text',
              text: '거래 지역을 입력하세요',
            },
          },
          label: {
            type: 'plain_text',
            text: '거래 지역',
          },
        },
        {
          type: 'input',
          block_id: 'description_block',
          element: {
            type: 'plain_text_input',
            action_id: 'description',
            placeholder: {
              type: 'plain_text',
              text: '추가 설명을 입력하세요',
            },
          },
          optional: true,
          label: {
            type: 'plain_text',
            text: '추가 설명',
          },
        },
        // TO DO: 이미지 연결
      ],
    },
  });
};

/**
 * 신규 거래에게 웰컴 메시지를 전송하고 정보 입력을 요청하는 이벤트 핸들러를 등록합니다.
 */
export function registerTradeEvents(app: App) {
  // 버튼 클릭 액션 핸들러 등록
  app.action<BlockAction>(
    'trade_provide_info',
    async ({ body, ack, client, logger }) => {
      await ack();

      try {
        const triggerId = body.trigger_id;
        const userId = body.user?.id;

        if (!triggerId || !userId) {
          logger.error('trigger_id 또는 user_id가 존재하지 않습니다.');
          return;
        }

        // 모달 뷰 열기
        await openTradeInfoModal(client, triggerId);
      } catch (error) {
        logger.error('모달 열기 중 오류 발생:', error);
      }
    },
  );

  // 모달 제출 핸들러 등록
  app.view('trade_info_modal', async ({ ack, body, view, client, logger }) => {
    await ack(); // ack()를 즉시 호출
    try {
      // 이후 작업 수행
      const userId = body.user?.id;
      if (!userId) {
        logger.error('사용자 ID가 존재하지 않습니다.');
        return;
      }
      const values = view.state.values;

      const name = values.name_block?.name?.value?.trim();
      const condition =
        values.condition_block?.condition?.selected_option?.value;
      const price = values.price_block?.price?.value?.trim();
      const place = values.place_block?.place?.value?.trim();
      const description =
        values.description_block?.description?.value?.trim() ?? '';

      if (!name || !condition || !price || !place) {
        await client.chat.postMessage({
          channel: userId,
          text: '모든 필드를 올바르게 입력해 주세요.',
        });
        return;
      }

      const tradeInfo: TradeInfo = {
        name,
        condition,
        price,
        place,
        description,
      };

      tradeInfoStore.set(userId, tradeInfo);

      await client.chat.postMessage({
        channel: userId,
        text: '거래 정보가 성공적으로 저장되었습니다! <#C088965R4FL|물건-삽니다-팝니다> 채널을 통해 확인해주세요!',
      });

      app.action<BlockAction>(
        'buy_action',
        async ({ body, ack, client, logger }) => {
          await ack(); // 슬랙에 응답

          // 타입 가드: 버튼 액션인지 확인
          const action = body.actions[0];
          if (action.type !== 'button') {
            logger.error(`Action is not a button: ${JSON.stringify(action)}`);
            return;
          }

          const initiatorId = body.user.id; // 버튼을 클릭한 사용자 ID
          const targetUserId = (action as ButtonAction).value; // 버튼의 value 값 가져오기

          try {
            // DM 채널 생성
            logger.info(
              `Creating DM channel between initiator: ${initiatorId} and target: ${targetUserId}`,
            );

            const dmResponse = await client.conversations.open({
              users: `${initiatorId},${targetUserId}`,
            });

            if (dmResponse.ok && dmResponse.channel?.id) {
              const dmChannelId = dmResponse.channel.id;

              // DM 메시지 보내기
              await client.chat.postMessage({
                channel: dmChannelId,
                text: `안녕하세요! <@${targetUserId}>님과의 거래를 시작합니다. 🎉\n안전한 거래를 진행해주세요!`,
              });

              logger.info(
                `DM channel created successfully. Message sent to DM: ${dmChannelId}`,
              );
            } else {
              logger.error('Failed to create DM channel:', dmResponse);
            }
          } catch (error) {
            logger.error('Error handling buy_action:', error);
          }
        },
      );

      app.action<BlockAction>(
        'inquiry_action',
        async ({ body, ack, client, logger }) => {
          await ack(); // 슬랙에 응답

          // 타입 가드: 버튼 액션인지 확인
          const action = body.actions[0];
          if (action.type !== 'button') {
            logger.error(`Action is not a button: ${JSON.stringify(action)}`);
            return;
          }

          const initiatorId = body.user.id; // 버튼을 클릭한 사용자 ID
          const targetUserId = (action as ButtonAction).value; // 버튼의 value 값 가져오기

          try {
            // DM 채널 생성
            logger.info(
              `Creating DM channel between initiator: ${initiatorId} and target: ${targetUserId}`,
            );

            const dmResponse = await client.conversations.open({
              users: `${initiatorId},${targetUserId}`,
            });

            if (dmResponse.ok && dmResponse.channel?.id) {
              const dmChannelId = dmResponse.channel.id;

              // DM 메시지 보내기
              await client.chat.postMessage({
                channel: dmChannelId,
                text: `문의 요청이 접수되었습니다! ❓\n판매자와 연락해 더 많은 정보를 받아보세요.`,
              });

              logger.info(
                `DM channel created successfully. Message sent to DM: ${dmChannelId}`,
              );
            } else {
              logger.error('Failed to create DM channel:', dmResponse);
            }
          } catch (error) {
            logger.error('Error handling inquiry_action:', error);
          }
        },
      );

      await client.chat.postMessage({
        channel: 'C088965R4FL',
        text: `New Trade Information: ${tradeInfo.name}`, // 기본 텍스트 (필수)
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '📢 새로운 거래 등록!',
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*물품명:*\n${tradeInfo.name}`,
              },
              {
                type: 'mrkdwn',
                text: `*상태:*\n${tradeInfo.condition}`,
              },
              {
                type: 'mrkdwn',
                text: `*가격:*\n${tradeInfo.price}`,
              },
              {
                type: 'mrkdwn',
                text: `*거래 장소:*\n${tradeInfo.place}`,
              },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*부가 설명:*\n${tradeInfo.description}`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: '구매할래요 🛒',
                  emoji: true,
                },
                action_id: 'buy_action',
                style: 'primary',
                value: userId,
              },
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: '궁금해요 ❓',
                  emoji: true,
                },
                action_id: 'inquiry_action',
                value: userId,
              },
            ],
          },
          {
            type: 'divider',
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Posted by GloBee🐝`,
              },
            ],
          },
        ],
      });

      console.log(`거래 정보 저장됨: ${userId}`, tradeInfo);
    } catch (error) {
      logger.error('모달 제출 처리 중 오류 발생:', error);
    }
  });

  // app.event('reaction_added', async ({ event, client, say, body, logger }) => {
  //   logger.info('Reaction added event received:', event);

  //   const { user, reaction, item, item_user } = event;

  //   // Step 1: Item type 확인
  //   if (item.type !== 'message') {
  //     logger.warn(`Reaction added to unsupported item type: ${item.type}`);
  //     return;
  //   }

  //   logger.info(
  //     `Reaction added: ${reaction}, by user: ${user}, on message: ${item.ts}`,
  //   );

  //   // Step 2: Reaction 필터링
  //   const isTradeAcceptReaction = isTradeAcceptRequestReaction(reaction);
  //   if (!isTradeAcceptReaction) {
  //     logger.info(
  //       `Reaction "${reaction}" is not a trade accept reaction. Ignoring.`,
  //     );
  //     return;
  //   }

  //   const { channel, ts } = item;

  //   // Step 3: Message history 가져오기
  //   try {
  //     logger.info(
  //       `Fetching message history for channel: ${channel}, ts: ${ts}`,
  //     );
  //     const history = await client.conversations.history({
  //       channel,
  //       latest: ts,
  //       limit: 1,
  //       inclusive: true,
  //     });

  //     logger.debug('Message history retrieved:', history);

  //     const authorId = history.messages && history.messages[0]?.user; // 작성자 ID
  //     const targetText = history.messages && history.messages[0]?.text;

  //     logger.info(`Message author ID: ${authorId}`);
  //     logger.info(`Target message text: "${targetText}"`);

  //     if (!targetText || !authorId) {
  //       logger.error(
  //         'Message text or author ID is missing. Sending failure message.',
  //       );
  //       makeTradeRequestFailMessage({
  //         channel,
  //         client,
  //         user,
  //       });
  //       return;
  //     }

  //     // Step 4: DM 채널 생성
  //     logger.info(
  //       `Creating DM channel between author: ${authorId} and user: ${user}`,
  //     );
  //     const dmResponse = await client.conversations.open({
  //       users: `${authorId},${user}`,
  //     });

  //     logger.debug('DM channel response:', dmResponse);

  //     if (dmResponse.ok && dmResponse.channel?.id) {
  //       const dmChannelId = dmResponse.channel.id;
  //       logger.info(`DM channel created: ${dmChannelId}`);

  //       // Step 5: DM 메시지 보내기
  //       const tradeMessage = `
  //       안녕하세요! 🛒
  //       아래의 메시지에 대해 거래를 요청하셨습니다:
  //       > "${targetText}"

  //       이 채널에서 거래를 진행해주세요.
  //       안전한 거래를 위해 필요한 추가 정보를 서로 확인하시고 협의하세요. 😊
  //     `;

  //       await client.chat.postMessage({
  //         channel: dmChannelId,
  //         text: tradeMessage.trim(),
  //       });

  //       logger.info('Trade request message sent to DM channel.');
  //     } else {
  //       logger.error('Failed to create DM channel:', dmResponse);
  //     }
  //   } catch (error) {
  //     logger.error('Error during processing reaction_added event:', error);
  //   }
  // });

  // app.event('reaction_added', async ({ event, client, say, body }) => {
  //   const { user, reaction, item, item_user } = event;
  //   if (item.type !== 'message') return;

  //   const isTradeAcceptReaction = isTradeAcceptRequestReaction(reaction);
  //   if (!isTradeAcceptReaction) return;

  //   const { channel, ts } = item;

  //   // conversations.history API를 통해 해당 메시지의 내용 가져오기
  //   const history = await client.conversations.history({
  //     channel,
  //     latest: ts, // 이모지가 추가된 메시지의 타임스탬프
  //     limit: 1, // 한 개의 메시지만 조회
  //     inclusive: true, // 정확히 해당 메시지를 포함하도록
  //   });

  //   const authorId = history.messages && history.messages[0].user; // 작성자 ID
  //   const targetText = history.messages && history.messages[0].text;

  //   console.log('targetText:', targetText);

  //   if (!targetText || !authorId) {
  //     makeTradeRequestFailMessage({
  //       channel,
  //       client,
  //       user,
  //     });
  //     return;
  //   }

  //   try {
  //     // 작성자와 현재 사용자 간의 DM 채널 생성
  //     const dmResponse = await client.conversations.open({
  //       users: `${authorId},${user}`, // DM을 생성할 사용자 ID들
  //     });

  //     if (dmResponse.ok && dmResponse.channel?.id) {
  //       const dmChannelId = dmResponse.channel.id; // 생성된 DM 채널 ID
  //       console.log(`DM channel created: ${dmChannelId}`);

  //       // 생성된 DM 채널에 거래 관련 메시지 보내기
  //       const tradeMessage = `
  //     안녕하세요! 🛒
  //     아래의 메시지에 대해 거래를 요청하셨습니다:
  //     > "${targetText}"

  //     이 채널에서 거래를 진행해주세요.
  //     안전한 거래를 위해 필요한 추가 정보를 서로 확인하시고 협의하세요. 😊
  //   `;

  //       await client.chat.postMessage({
  //         channel: dmChannelId,
  //         text: tradeMessage.trim(),
  //       });
  //     } else {
  //       console.error('Failed to create DM channel:', dmResponse);
  //     }
  //   } catch (error) {
  //     console.error('Error creating DM channel:', error);
  //   }
  // });

  // '/trade' 명령어 핸들러 등록

  app.command('/trade', async ({ command, ack, client, logger }) => {
    await ack();

    try {
      const triggerId = command.trigger_id;
      const userId = command.user_id;

      if (!triggerId || !userId) {
        logger.error('trigger_id 또는 user_id가 존재하지 않습니다.');
        return;
      }

      // 모달 뷰 열기
      await openTradeInfoModal(client, triggerId);
    } catch (error) {
      logger.error('모달 열기 중 오류 발생:', error);
    }
  });
}

/**
 * 거래 정보를 가져오는 함수
 * @param userId 거래 ID
 * @returns 거래 정보 또는 undefined
 */
export const getTradeInfo = (userId: string): TradeInfo | undefined => {
  return tradeInfoStore.get(userId);
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
