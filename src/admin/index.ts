// src/admin/index.ts

import { boltApp } from '../index';
import { SlashCommand, Logger } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { isUserAdmin } from '../utils/admin';
import { uploadToS3 } from '../s3service';

// 인메모리 워크스페이스 정보 저장소
let workspaceInfo: WorkspaceInfo = {
  country: '',
  university: '',
  universitySite: '', // 추가된 필드
};

// 워크스페이스 정보 인터페이스
interface WorkspaceInfo {
  country: string;
  university: string;
  universitySite: string; // 추가된 필드
}

/**
 * 워크스페이스 정보를 입력하는 모달을 여는 함수
 * @param client Slack WebClient
 * @param triggerId 트리거 ID
 */
const openWorkspaceInfoModal = async (client: WebClient, triggerId: string) => {
  await client.views.open({
    trigger_id: triggerId,
    view: {
      type: 'modal',
      callback_id: 'workspace_info_modal',
      title: {
        type: 'plain_text',
        text: 'GloBee🐝 워크스페이스 정보 설정',
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
          block_id: 'country_block',
          element: {
            type: 'plain_text_input',
            action_id: 'country',
            placeholder: {
              type: 'plain_text',
              text: '국가를 입력하세요',
            },
          },
          label: {
            type: 'plain_text',
            text: '국가',
          },
        },
        {
          type: 'input',
          block_id: 'university_block',
          element: {
            type: 'plain_text_input',
            action_id: 'university',
            placeholder: {
              type: 'plain_text',
              text: '대학을 입력하세요',
            },
          },
          label: {
            type: 'plain_text',
            text: '대학',
          },
        },
        {
          type: 'input',
          block_id: 'university_site_block',
          element: {
            type: 'plain_text_input',
            action_id: 'universitySite',
            placeholder: {
              type: 'plain_text',
              text: '대학 웹사이트 주소를 입력하세요',
            },
          },
          label: {
            type: 'plain_text',
            text: '대학 웹사이트',
          },
        },
      ],
    },
  });
};

/**
 * 관리자 전용 이벤트 핸들러를 등록합니다.
 */
export const registerAdminEvents = async () => {
  // '/globee_admin' 명령어 핸들러 등록
  boltApp.command('/globee_admin', async ({ command, ack, client, logger }) => {
    await ack();

    const { trigger_id, user_id, channel_id } = command;

    logger.info(
      `Received /globee_admin command from user: ${user_id} in channel: ${channel_id}`,
    );

    try {
      if (!trigger_id || !user_id) {
        logger.error('trigger_id 또는 user_id가 존재하지 않습니다.');
        return;
      }

      // 관리자 여부 확인
      const isAdmin = await isUserAdmin(client, user_id, logger);

      if (!isAdmin) {
        // 관리자가 아닌 경우 권한 없음 메시지 전송
        await client.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          text: '이 명령어를 사용할 권한이 없습니다.',
        });
        return;
      }

      // 모달 열기
      await openWorkspaceInfoModal(client, trigger_id);
    } catch (error) {
      logger.error('워크스페이스 정보 모달 열기 중 오류 발생:', error);
    }
  });

  // 워크스페이스 정보 모달 제출 핸들러 등록
  boltApp.view(
    'workspace_info_modal',
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
        const country = values.country_block?.country?.value?.trim();
        const university = values.university_block?.university?.value?.trim();
        const universitySite =
          values.university_site_block?.universitySite?.value?.trim();

        if (!country || !university || !universitySite) {
          // 필수 입력값이 누락된 경우
          await client.chat.postEphemeral({
            channel: userId,
            user: userId,
            text: '모든 필드를 올바르게 입력해 주세요.',
          });
          return;
        }

        // 워크스페이스 정보 저장
        workspaceInfo = {
          country,
          university,
          universitySite, // 추가된 필드 저장
        };

        // 확인 메시지 전송
        await client.chat.postEphemeral({
          channel: userId,
          user: userId,
          text: `GloBee🐝 워크스페이스 정보가 성공적으로 저장되었습니다!
      - *국가*: ${country}
      - *대학*: ${university}
      - *대학 웹사이트*: ${universitySite}`,
        });

        const workspaceInfoString = JSON.stringify(workspaceInfo);

        // JSON 문자열을 Buffer로 변환
        const workspaceInfoBuffer = Buffer.from(workspaceInfoString, 'utf-8');

        // S3 업로드
        await uploadToS3(
          workspaceInfoBuffer,
          `${process.env.LACK_BOT_TOKEN}.json`,
        ); // 파일 이름에 확장자 추가

        console.log(`워크스페이스 정보 저장됨:`, workspaceInfo);
      } catch (error) {
        logger.error('워크스페이스 정보 제출 처리 중 오류 발생:', error);
      }
    },
  );
};

/**
 * 워크스페이스 정보를 가져오는 함수
 * @returns 워크스페이스 정보
 */
export const getWorkspaceInfo = (): WorkspaceInfo => {
  return workspaceInfo;
};
