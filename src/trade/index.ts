import { boltApp } from '../index';
import { Logger, BlockAction, SlashCommand } from '@slack/bolt'; // Command 제거
import { WebClient } from '@slack/web-api';

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
      callback_id: 'welcome_info_modal',
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
                value: 'new',
              },
              {
                text: {
                  type: 'plain_text',
                  text: '약간 사용',
                },
                value: 'used',
              },
              {
                text: {
                  type: 'plain_text',
                  text: '사용감 있음',
                },
                value: 'worn',
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
          label: {
            type: 'plain_text',
            text: '추가 설명을',
          },
        },
      ],
    },
  });
};

/**
 * 신규 거래에게 웰컴 메시지를 전송하고 정보 입력을 요청하는 이벤트 핸들러를 등록합니다.
 */
export const registerTradeEvents = async () => {
  // 'team_join' 이벤트 핸들러 등록
  // boltApp.event('team_join', async ({ event, client, logger }) => {
  //   try {
  //     const userId = event.user?.id;
  //     if (!userId) {
  //       logger.error('User ID가 존재하지 않습니다.');
  //       return;
  //     }

  //     // 사용자와의 DM 채널 열기
  //     const im = await client.conversations.open({ users: userId });
  //     const channel = im.channel?.id;

  //     if (!channel) {
  //       logger.error(`사용자 ${userId}와의 DM 채널을 열 수 없습니다.`);
  //       return;
  //     }

  //     // 웰컴 메시지 전송
  //     await client.chat.postMessage({
  //       channel: channel,
  //       text: 'Welcome to Globee!',
  //       blocks: [
  //         {
  //           type: 'section',
  //           text: {
  //             type: 'mrkdwn',
  //             text: `안녕하세요 <@${userId}>님, 당신의 교환학생 생활을 더욱 풍요롭게 만드는 GloBee🐝에 오신 것을 환영합니다! 아래 버튼을 눌러 당신에 대한 정보를 알려주세요!`,
  //           },
  //         },
  //         {
  //           type: 'actions',
  //           elements: [
  //             {
  //               type: 'button',
  //               text: {
  //                 type: 'plain_text',
  //                 text: '정보 입력하기',
  //               },
  //               action_id: 'welcome_provide_info',
  //               style: 'primary',
  //             },
  //           ],
  //         },
  //       ],
  //     });
  //   } catch (error) {
  //     logger.error('웰컴 메시지 전송 중 오류 발생:', error);
  //   }
  // });

  // 버튼 클릭 액션 핸들러 등록
  boltApp.action<BlockAction>(
    'welcome_provide_info',
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
  boltApp.view(
    'welcome_info_modal',
    async ({ ack, body, view, client, logger }) => {
      await ack();

      try {
        const userId = body.user?.id;
        if (!userId) {
          logger.error('사용자 ID가 존재하지 않습니다.');
          return;
        }

        const values = view.state.values;

        // 입력된 값 추출
        const name = values.name_block?.name?.value?.trim();
        const condition =
          values.condition_block?.condition?.selected_option?.value;
        const price = values.price_block?.price?.value?.trim();
        const place = values.place_block?.place?.value?.trim();
        const description =
          values.description_block?.description?.value?.trim();

        if (!name || !condition || !price || !place || !description) {
          // 필수 입력값이 누락된 경우
          await client.chat.postMessage({
            channel: userId,
            text: '모든 필드를 올바르게 입력해 주세요.',
          });
          return;
        }

        // 사용자 정보 저장
        const tradeInfo: TradeInfo = {
          name,
          condition,
          price,
          place,
          description,
        };
        tradeInfoStore.set(userId, tradeInfo);

        // 확인 메시지 전송
        await client.chat.postMessage({
          channel: userId,
          text: '거래 정보가 성공적으로 저장되었습니다! 감사합니다.',
        });

        console.log(`거래 정보 저장됨: ${userId}`, tradeInfo);
      } catch (error) {
        logger.error('모달 제출 처리 중 오류 발생:', error);
      }
    },
  );

  // '/trade' 명령어 핸들러 등록
  boltApp.command('/trade', async ({ command, ack, client, logger }) => {
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
};

/**
 * 거래 정보를 가져오는 함수
 * @param userId 거래 ID
 * @returns 거래 정보 또는 undefined
 */
export const getTradeInfo = (userId: string): TradeInfo | undefined => {
  return tradeInfoStore.get(userId);
};
