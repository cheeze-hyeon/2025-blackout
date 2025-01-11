import { boltApp } from '../index';
import { BlockAction, SlashCommand, ViewSubmitAction } from '@slack/bolt';
import { WebClient } from '@slack/web-api';

// 인메모리 워크스페이스 정보 저장소
let workspaceInfo: WorkspaceInfo = {
  country: '',
  university: '',
};

// 워크스페이스 정보 인터페이스
interface WorkspaceInfo {
  country: string;
  university: string;
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
      ],
    },
  });
};

/**
 * 관리자 전용 이벤트 핸들러를 등록합니다.
 */
export const registerAdminEvents = () => {
  // '/globee_admin' 명령어 핸들러 등록
  boltApp.command('/globee_admin', async ({ command, ack, client, logger }) => {
    await ack();

    try {
      const triggerId = command.trigger_id;
      const userId = command.user_id;

      if (!triggerId || !userId) {
        logger.error('trigger_id 또는 user_id가 존재하지 않습니다.');
        return;
      }

      // 사용자 정보 가져오기
      const userInfo = await client.users.info({ user: userId });
      if (!userInfo.ok || !userInfo.user) {
        logger.error(`사용자 정보 가져오기 실패: ${userId}`);
        return;
      }

      const isAdmin = userInfo.user.is_admin || false;

      if (!isAdmin) {
        // 관리자가 아닌 경우 권한 없음 메시지 전송
        await client.chat.postEphemeral({
          channel: command.channel_id,
          user: userId,
          text: '이 명령어를 사용할 권한이 없습니다.',
        });
        return;
      }

      // 모달 열기
      await openWorkspaceInfoModal(client, triggerId);
    } catch (error) {
      logger.error('워크스페이스 정보 모달 열기 중 오류 발생:', error);
    }
  });

  // 워크스페이스 정보 모달 제출 핸들러 등록
  boltApp.view('workspace_info_modal', async ({ ack, body, view, client, logger }) => {
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

      if (!country || !university) {
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
      };

      // 확인 메시지 전송
      await client.chat.postEphemeral({
        channel: userId,
        user: userId,
        text: '워크스페이스 정보가 성공적으로 저장되었습니다! 감사합니다.',
      });

      console.log(`워크스페이스 정보 저장됨:`, workspaceInfo);
    } catch (error) {
      logger.error('워크스페이스 정보 제출 처리 중 오류 발생:', error);
    }
  });
};

/**
 * 워크스페이스 정보를 가져오는 함수
 * @returns 워크스페이스 정보
 */
export const getWorkspaceInfo = (): WorkspaceInfo => {
  return workspaceInfo;
};