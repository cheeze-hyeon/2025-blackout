import { App } from '@slack/bolt';
import { requestHelpService } from '../AImodel'; // AI 모델의 requestHelpService 함수 가져오기

export function registerAskCommand(boltApp: App) {
  // 슬래시 명령어 '/ask' 등록
  boltApp.command('/ask', async ({ command, ack, respond }) => {
    // 슬래시 명령어를 확인
    await ack();

    try {
      const userInput = command.text; // 사용자가 입력한 질문
      if (!userInput || userInput.trim() === '') {
        await respond('질문을 입력해주세요! 예: `/ask 자유로운 질문`');
        return;
      }

      // AI 모델 호출
      const responseText = await requestHelpService(userInput);

      // 사용자에게 응답
      await respond({
        text: userInput + responseText,
        response_type: 'in_channel', // 'in_channel'로 설정하면 채널에 메시지 출력, 'ephemeral'로 설정하면 사용자에게만 출력
      });
    } catch (error) {
      console.error('Error handling /ask command:', error);
      await respond('질문을 처리하는 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
  });
}