import { App } from '@slack/bolt';
import { Request, Response } from 'express';
import { WebClient, View } from '@slack/web-api';
import { boltApp } from '../index'; // index.ts에서 export한 boltApp

/**
 * /network 슬래시 커맨드를 처리하는 함수.
 * - 모달 열기만 수행하고, 실제 모달 제출 핸들러는 아래 registerNetworkViewHandler에서 담당
 */
export async function handleNetworkCommand(req: Request, res: Response) {
  const { trigger_id, channel_id } = req.body;

  try {
    const view: View = {
      type: 'modal',
      callback_id: 'network_modal',
      title: {
        type: 'plain_text',
        text: '네트워킹 조 편성',
      },
      submit: {
        type: 'plain_text',
        text: '완료',
      },
      close: {
        type: 'plain_text',
        text: '취소',
      },
      private_metadata: channel_id,
      blocks: [
        {
          type: 'input',
          block_id: 'network_name_block',
          label: {
            type: 'plain_text',
            text: '네트워킹 이름',
          },
          element: {
            type: 'plain_text_input',
            action_id: 'network_name_input',
            placeholder: {
              type: 'plain_text',
              text: '예: 봄맞이 네트워킹',
            },
          },
        },
        {
          type: 'input',
          block_id: 'team_count_block',
          label: {
            type: 'plain_text',
            text: '조 개수',
          },
          element: {
            type: 'number_input',
            action_id: 'team_count_input',
            min_value: '1',
            is_decimal_allowed: false,
          },
        },
        {
          type: 'input',
          block_id: 'info_block',
          label: {
            type: 'plain_text',
            text: '추가 안내 (예: 조장 관련, 모임 장소 등)',
          },
          element: {
            type: 'plain_text_input',
            action_id: 'info_input',
            multiline: true,
            placeholder: {
              type: 'plain_text',
              text: '예: 각 조에서 가장 앞에 있는 사람이 조장이 됩니다.',
            },
          },
          optional: true,
        },
      ],
    };

    // 모달 열기
    await boltApp.client.views.open({
      trigger_id,
      view,
    });

    // 응답
    res.status(200).send();
  } catch (error) {
    console.error('Error opening modal:', error);
    res.status(500).send('모달을 열 수 없습니다.');
  }
}

/**
 * 모달 제출 핸들러 등록 함수.
 * - boltApp.view('network_modal', ...) 내부 로직을 여기서 정의
 */
export function registerNetworkViewHandler(app: App) {
  app.view('network_modal', async ({ ack, body, view, client, logger }) => {
    await ack();

    const user = body.user.id;
    const channelId = view.private_metadata; // 모달을 연 채널 ID
    const networkName = view.state.values.network_name_block.network_name_input.value;
    const teamCountValue = view.state.values.team_count_block.team_count_input.value ?? '0';
    const teamCount = parseInt(teamCountValue, 10);
    const additionalInfo = view.state.values.info_block.info_input.value ?? '';

    try {
      // 팀 개수 유효성 검사
      if (teamCount < 1) {
        throw new Error('조 개수는 최소 1 이상이어야 합니다.');
      }

      // 채널 멤버 가져오기
      const result = await client.conversations.members({
        channel: channelId,
        limit: 1000,
      });

      let members = result.members || [];

      // 1) USLACKBOT 제외
      members = members.filter((m) => m !== 'USLACKBOT');

      // 2) 봇 / 앱 계정 제외
      const filtered: string[] = [];
      for (const memberId of members) {
        const userInfo = await client.users.info({ user: memberId });
        if (!userInfo.user) continue;
        if (userInfo.user.is_bot) continue;
        filtered.push(memberId);
      }
      members = filtered;

      if (teamCount > members.length) {
        throw new Error('조 개수가 채널의 사용자 수를 초과할 수 없습니다.');
      }

      // 사용자 정보 가져오기
      const web = new WebClient(process.env.SLACK_BOT_TOKEN);
      const userProfiles = await Promise.all(
        members.map(async (member) => {
          const profile = await web.users.profile.get({ user: member });
          return { id: member, name: profile.profile?.real_name || member };
        })
      );

      // 랜덤 섞기
      const shuffled = userProfiles.sort(() => 0.5 - Math.random());
      const teams: { [key: number]: typeof userProfiles } = {};
      for (let i = 0; i < teamCount; i++) {
        teams[i] = [];
      }
      shuffled.forEach((member, index) => {
        teams[index % teamCount].push(member);
      });

      // 메시지 포맷 생성
      let message = `*${networkName}* 네트워킹 조 편성 완료!\n\n`;
      for (let i = 0; i < teamCount; i++) {
        const teamMembers = teams[i].map((m) => `<@${m.id}>`).join(', ');
        message += `*조 ${i + 1}:* ${teamMembers}\n`;
      }

      if (additionalInfo.trim() !== '') {
        message += `\n*추가 안내:* ${additionalInfo}`;
      }

      // 채널에 조 편성 결과 메시지 전송
      await client.chat.postMessage({
        channel: channelId,
        text: message,
      });

      // 각 조별 멀티 DM 생성
      for (let i = 0; i < teamCount; i++) {
        const userIds = teams[i].map((m) => m.id);
        if (userIds.length > 8) {
          await client.chat.postMessage({
            channel: channelId,
            text: `조 ${i + 1} 인원이 8명을 초과하여 DM 방을 생성할 수 없습니다.`,
          });
          continue;
        }

        const openResult = await client.conversations.open({
          users: userIds.join(','),
        });

        const mpimChannelId = openResult.channel?.id;
        if (!mpimChannelId) {
          await client.chat.postMessage({
            channel: channelId,
            text: `조 ${i + 1} DM 생성에 실패했습니다.`,
          });
          continue;
        }

        await client.chat.postMessage({
          channel: mpimChannelId,
          text: `*${networkName}* - 조 ${i + 1} 멤버들끼리의 단체 DM입니다! 자유롭게 대화하세요.`,
        });
      }
    } catch (error) {
      logger.error('Error processing network command:', error);

      let errorMsg = '네트워킹 조 편성 중 오류가 발생했습니다.';
      if (error instanceof Error) {
        errorMsg += `: ${error.message}`;
      }

      try {
        await client.chat.postMessage({
          channel: channelId,
          text: errorMsg,
        });
      } catch (postError) {
        logger.error('Error sending error message:', postError);
      }
    }
  });
}
