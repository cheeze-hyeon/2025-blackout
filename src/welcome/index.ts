import { boltApp } from '../index';
import { Logger, BlockAction, SlashCommand } from '@slack/bolt'; // Command 제거
import { WebClient } from '@slack/web-api';
import { uploadToS3 } from '../s3service';
import fs from 'fs';

// 인메모리 사용자 정보 저장소
const userInfoStore: Map<string, UserInfo> = new Map();

// 사용자 정보 인터페이스
interface UserInfo {
  name: string;
  gender: string;
  age: string;
  nationality: string;
  almaMater: string;
}

/**
 * 사용자 정보 입력 모달을 여는 함수
 * @param client Slack WebClient
 * @param triggerId 트리거 ID
 */
const openUserInfoModal = async (client: WebClient, triggerId: string) => {
  await client.views.open({
    trigger_id: triggerId,
    view: {
      type: 'modal',
      callback_id: 'welcome_info_modal',
      title: {
        type: 'plain_text',
        text: '환영합니다!',
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
              text: '이름을 입력하세요',
            },
          },
          label: {
            type: 'plain_text',
            text: '이름',
          },
        },
        {
          type: 'input',
          block_id: 'gender_block',
          element: {
            type: 'static_select',
            action_id: 'gender',
            placeholder: {
              type: 'plain_text',
              text: '성별을 선택하세요',
            },
            options: [
              {
                text: {
                  type: 'plain_text',
                  text: '남성',
                },
                value: 'male',
              },
              {
                text: {
                  type: 'plain_text',
                  text: '여성',
                },
                value: 'female',
              },
              {
                text: {
                  type: 'plain_text',
                  text: '기타',
                },
                value: 'other',
              },
            ],
          },
          label: {
            type: 'plain_text',
            text: '성별',
          },
        },
        {
          type: 'input',
          block_id: 'age_block',
          element: {
            type: 'plain_text_input',
            action_id: 'age',
            placeholder: {
              type: 'plain_text',
              text: '나이를 입력하세요',
            },
          },
          label: {
            type: 'plain_text',
            text: '나이',
          },
        },
        {
          type: 'input',
          block_id: 'nationality_block',
          element: {
            type: 'plain_text_input',
            action_id: 'nationality',
            placeholder: {
              type: 'plain_text',
              text: '국적을 입력하세요',
            },
          },
          label: {
            type: 'plain_text',
            text: '국적',
          },
        },
        {
          type: 'input',
          block_id: 'alma_mater_block',
          element: {
            type: 'plain_text_input',
            action_id: 'alma_mater',
            placeholder: {
              type: 'plain_text',
              text: '출신 학교를 입력하세요',
            },
          },
          label: {
            type: 'plain_text',
            text: '출신 학교',
          },
        },
      ],
    },
  });
};

/**
 * 신규 사용자에게 웰컴 메시지를 전송하고 정보 입력을 요청하는 이벤트 핸들러를 등록합니다.
 */
export const registerWelcomeEvents = async () => {
  // 'team_join' 이벤트 핸들러 등록
  boltApp.event('team_join', async ({ event, client, logger }) => {
    try {
      const userId = event.user?.id;
      if (!userId) {
        logger.error('User ID가 존재하지 않습니다.');
        return;
      }

      // 사용자와의 DM 채널 열기
      const im = await client.conversations.open({ users: userId });
      const channel = im.channel?.id;

      if (!channel) {
        logger.error(`사용자 ${userId}와의 DM 채널을 열 수 없습니다.`);
        return;
      }

      // 웰컴 메시지 전송
      await client.chat.postMessage({
        channel: channel,
        text: 'Welcome to Globee!',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `안녕하세요 <@${userId}>님, 당신의 교환학생 생활을 더욱 풍요롭게 만드는 GloBee🐝에 오신 것을 환영합니다! 아래 버튼을 눌러 당신에 대한 정보를 알려주세요!`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: '정보 입력하기',
                },
                action_id: 'welcome_provide_info',
                style: 'primary',
              },
            ],
          },
        ],
      });
    } catch (error) {
      logger.error('웰컴 메시지 전송 중 오류 발생:', error);
    }
  });

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
        await openUserInfoModal(client, triggerId);
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
        const gender = values.gender_block?.gender?.selected_option?.value;
        const age = values.age_block?.age?.value?.trim();
        const nationality =
          values.nationality_block?.nationality?.value?.trim();
        const almaMater = values.alma_mater_block?.alma_mater?.value?.trim();

        if (!name || !gender || !age || !nationality || !almaMater) {
          // 필수 입력값이 누락된 경우
          await client.chat.postMessage({
            channel: userId,
            text: '모든 필드를 올바르게 입력해 주세요.',
          });
          return;
        }

        // 사용자 정보 저장
        const userInfo: UserInfo = {
          name,
          gender,
          age,
          nationality,
          almaMater,
        };
        userInfoStore.set(userId, userInfo);

        const userInfoString = JSON.stringify(userInfo);

        // JSON 문자열을 Buffer로 변환
        const userInfoBuffer = Buffer.from(userInfoString, 'utf-8');

        // S3 업로드
        await uploadToS3(userInfoBuffer, `${userId}.json`); // 파일 이름에 확장자 추가

        // 확인 메시지 전송
        await client.chat.postMessage({
          channel: userId,
          text: `GloBee🐝 개인 정보가 성공적으로 저장되었습니다!
    - *이름*: ${name}
    - *성별*: ${gender}
    - *나이*: ${age}
    - *국적*: ${nationality}
    - *출신 대학*: ${almaMater}
    정보가 잘못되었다면, \`/globee_start\` 커맨드를 통해 다시 입력할 수 있습니다.`,

        });

        console.log(`사용자 정보 저장됨: ${userId}`, userInfo);
      } catch (error) {
        logger.error('모달 제출 처리 중 오류 발생:', error);
      }
    },
  );

  // '/globee_start' 명령어 핸들러 등록
  boltApp.command('/globee_start', async ({ command, ack, client, logger }) => {
    await ack();

    try {
      const triggerId = command.trigger_id;
      const userId = command.user_id;

      if (!triggerId || !userId) {
        logger.error('trigger_id 또는 user_id가 존재하지 않습니다.');
        return;
      }

      // 모달 뷰 열기
      await openUserInfoModal(client, triggerId);
    } catch (error) {
      logger.error('모달 열기 중 오류 발생:', error);
    }
  });
};

/**
 * 사용자 정보를 가져오는 함수
 * @param userId 사용자 ID
 * @returns 사용자 정보 또는 undefined
 */
export const getUserInfo = (userId: string): UserInfo | undefined => {
  return userInfoStore.get(userId);
};
