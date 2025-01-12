import { App, Logger, BlockAction } from '@slack/bolt'; // Command 제거
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
            type: 'divider',
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: 'Posted by GloBee🐝',
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
